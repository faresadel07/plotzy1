# Piper voice models

This directory holds the ONNX voice models used by `lib/piper-tts.ts`
for the Audiobook Studio feature. The models are NOT committed to git
(they total ~350 MB and individual files exceed GitHub's 100 MB limit).

## Required voices

| File | Size | Source |
|---|---:|---|
| `en_US-lessac-high.onnx` (+ `.onnx.json`) | 113 MB | Lessac, en_US, high tier |
| `en_US-hfc_female-medium.onnx` (+ `.onnx.json`) | 63 MB | HFC Female, en_US, medium tier |
| `en_GB-jenny_dioco-medium.onnx` (+ `.onnx.json`) | 63 MB | Jenny Dioco, en_GB, medium tier |
| `en_GB-northern_english_male-medium.onnx` (+ `.onnx.json`) | 63 MB | Northern English Male, en_GB, medium tier |
| `ar_JO-kareem-medium.onnx` (+ `.onnx.json`) | 63 MB | Kareem, ar_JO, medium tier |

## Local-dev download

Run from the repo root:

```sh
cd artifacts/api-server/voices
for v in \
  en/en_US/lessac/high/en_US-lessac-high \
  en/en_US/hfc_female/medium/en_US-hfc_female-medium \
  en/en_GB/jenny_dioco/medium/en_GB-jenny_dioco-medium \
  en/en_GB/northern_english_male/medium/en_GB-northern_english_male-medium \
  ar/ar_JO/kareem/medium/ar_JO-kareem-medium; do
  fname=$(basename "$v")
  curl -sLfo "${fname}.onnx"      "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v}.onnx"
  curl -sLfo "${fname}.onnx.json" "https://huggingface.co/rhasspy/piper-voices/resolve/main/${v}.onnx.json"
done
```

## Production (Docker)

The Dockerfile fetches these models at build time via the same `curl`
loop. See `Dockerfile` (Piper integration block, deferred to a follow-up
batch). The voices end up baked into the image at `/app/artifacts/api-server/voices/`.

## Licenses

Each voice has its own license under HuggingFace — see the `dataset` and
`language.code_name` fields in the corresponding `.onnx.json` config. The
five voices selected for production all permit redistribution under their
respective licenses (the rhasspy/piper-voices repo redistributes them).
