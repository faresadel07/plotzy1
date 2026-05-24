# Tutorial images

Photo-based tutorials live here. One folder per guide; the folder name
matches the `id` of the guide in
[`../src/data/tutorial-guides.ts`](../../src/data/tutorial-guides.ts).

Example layout:

```
public/tutorials/
  create-your-first-book/
    step-1.png
    step-2.png
    step-3.png
  publish-to-the-library/
    step-1.png
    step-2.png
```

Files placed here are served directly by Vercel as static assets at
`/tutorials/<folder>/<file>` — they do NOT pass through the API
server, and they do NOT consume any database storage.

## Image guidance

- **Format:** PNG for UI screenshots (lossless), JPEG for photos.
- **Width:** 1600 px is a good upper bound; the modal scales them
  down to 960 px max. Anything beyond 2400 px just wastes bandwidth.
- **Naming:** `step-N.png` keeps the order obvious. Pick what makes
  sense, the order in code is what actually controls rendering.
- **Compression:** Pass new files through `squoosh.app` or similar;
  300–500 KB per screenshot is a healthy target.
