import { useEffect, useRef, useState } from "react";

interface FeatureVideoProps {
  /** Path to the video file served from /public/videos/.
   *  When undefined, or when the file cannot be loaded, the fallback renders. */
  src?: string;
  /** Static content shown while no video is available (or while video loads). */
  fallback: React.ReactNode;
  /** URL shown in the macOS-style browser chrome bar. */
  label?: string;
  /** Use dark chrome (for dark-background cards). */
  dark?: boolean;
}

/**
 * FeatureVideo
 *
 * Strategy:
 *   1. Always render the static fallback immediately — zero flicker, zero black box.
 *   2. Pre-load the video silently in the background (display:none).
 *   3. On `canplay` → swap to the real video player.
 *   4. On `error`  → keep showing the static fallback (file missing = no breakage).
 *
 * Auto-plays muted when 40% of the element is in the viewport (IntersectionObserver),
 * pauses when it leaves — matching the Reedsy / SaaS landing-page pattern.
 *
 * Drop video files into:   client/public/videos/
 * Reference them as:       /videos/<filename>.mp4
 */
export function FeatureVideo({ src, fallback, label = "plotzy.app", dark = false }: FeatureVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  /* ── once video confirms it can play, auto-play when in viewport ── */
  useEffect(() => {
    if (!src || !videoReady || !videoRef.current) return;
    const video = videoRef.current;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, [src, videoReady]);

  const barBg = dark ? "#111111" : "#f5f2ee";
  const barBorder = dark ? "rgba(255,255,255,0.06)" : "#e8e4dc";
  const urlBg = dark ? "rgba(255,255,255,0.06)" : "white";
  const urlColor = dark ? "rgba(255,255,255,0.35)" : "#999";

  return (
    <div className="relative">
      {/* Static fallback — always rendered; hidden only when video is playing */}
      <div style={{ display: videoReady ? "none" : "block" }}>
        {fallback}
      </div>

      {/* Video player — pre-loads silently; revealed once canPlay fires */}
      {src && (
        <div
          style={{ display: videoReady ? "block" : "none" }}
          className="rounded-2xl overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.12)] border border-[#e8e4dc]"
        >
          {/* macOS-style browser chrome bar */}
          <div
            style={{ background: barBg, borderBottom: `1px solid ${barBorder}` }}
            className="px-4 py-3 flex items-center gap-2 select-none"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <div
              style={{ background: urlBg, color: urlColor }}
              className="ml-4 flex-1 rounded-md px-3 py-1 text-xs truncate"
            >
              {label}
            </div>
          </div>

          {/* The video itself */}
          <video
            ref={videoRef}
            src={src}
            muted
            loop
            playsInline
            preload="auto"
            onCanPlay={() => setVideoReady(true)}
            onError={() => setVideoReady(false)}
            className="w-full block"
          />
        </div>
      )}
    </div>
  );
}
