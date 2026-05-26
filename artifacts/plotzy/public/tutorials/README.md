# Tutorial media

Photo and silent-video tutorials live here. One folder per guide;
the folder name matches the `id` of the guide in
[`../src/data/tutorial-guides.ts`](../../src/data/tutorial-guides.ts).

Example layout:

```
public/tutorials/
  community/
    community.mp4          ← silent walkthrough video
  marketplace/
    marketplace.mp4
  cover-designer/
    cover-designer.mp4
  create-your-first-book/  ← image-only guide
    step-1.png
    step-2.png
    step-3.png
```

Files placed here are served directly by Vercel as static assets at
`/tutorials/<folder>/<file>` — they do NOT pass through the API
server, and they do NOT consume any database storage.

## Video files

The tutorial system was built around **silent screen recordings**:
- They autoplay muted on a loop in the modal, reading like an
  animated illustration of the section.
- Browsers always allow muted autoplay, so no user interaction is
  needed.
- Audio is not required — the explanation text is written beside
  the video.

### Naming

Name the file after the guide id so it is self-describing:
`community/community.mp4`, `marketplace/marketplace.mp4`, etc.

### Format

- **Container:** MP4 (H.264 video, no audio track).
- **Resolution:** 1280×720 or 1920×1080. Higher just wastes bandwidth.
- **Bitrate:** 1–2 Mbps for a screen recording is plenty.
- **Length:** 15–90 seconds. The loop should feel natural.
- **Size:** target under 10 MB per video to stay well within Vercel's
  static-asset budget.

Tools that produce a small clean MP4:
- macOS QuickTime "Save as..." with H.264.
- ffmpeg: `ffmpeg -i in.mov -c:v libx264 -crf 23 -an -movflags +faststart out.mp4`
  (the `-an` strips audio).
- HandBrake desktop app — pick "Web Optimized" preset.

## Image files

- **Format:** PNG for UI screenshots (lossless), JPEG for photos.
- **Width:** 1600 px is a good upper bound; the modal scales them
  down to 960 px max.
- **Naming:** `step-1.png`, `step-2.png`, ... — the order in code is
  what actually controls rendering, but ordered filenames keep the
  folder readable.
- **Compression:** Pass new files through `squoosh.app` or similar;
  300–500 KB per screenshot is a healthy target.
