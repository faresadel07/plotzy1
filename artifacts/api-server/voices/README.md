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

**The Dockerfile auto-downloads these models during build** via the same
`curl` loop shown above. See the `# ── Piper voice models` block in the
project root `Dockerfile` (runtime stage). The voices end up baked into
the final image at `/app/artifacts/api-server/voices/` and add ~350 MB
to the image size. No manual steps are needed for production deploys;
just `docker build`.

The voice download is a single Docker layer that only invalidates when
the voice list itself changes, so application-code changes do NOT
re-download voices on rebuild.

## Licenses

Each voice has its own license under HuggingFace — see the `dataset` and
`language.code_name` fields in the corresponding `.onnx.json` config. The
five voices selected for production all permit redistribution under their
respective licenses (the rhasspy/piper-voices repo redistributes them).
