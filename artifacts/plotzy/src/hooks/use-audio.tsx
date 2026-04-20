import { useCallback, useEffect, useRef, useState } from "react";
import { PRESETS, type AmbientHandle, type AmbientPresetId } from "@/lib/procedural-ambient";

/**
 * Procedural ambient-soundscape hook.
 *
 * Drives the Web Audio API via lib/procedural-ambient presets so the
 * AmbientSoundscape popover can play one preset at a time with a master
 * volume slider and a clean teardown on unmount / toggle.
 *
 * Everything is synthesised in the browser — there are no URLs, no network
 * calls, and no files to licence. The AudioContext is created lazily on the
 * first user-triggered play() so browser autoplay policies are satisfied.
 */
export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<AmbientPresetId | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const handleRef = useRef<AmbientHandle | null>(null);

  const ensureCtx = (): { ctx: AudioContext; master: GainNode } => {
    if (!ctxRef.current) {
      const AC: typeof AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const master = ctx.createGain();
      master.gain.value = volume;
      master.connect(ctx.destination);
      ctxRef.current = ctx;
      masterRef.current = master;
    }
    // Some browsers suspend the context when created without direct user
    // interaction; try to resume in case we're called from one.
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume().catch(() => {});
    }
    return { ctx: ctxRef.current, master: masterRef.current! };
  };

  const stopCurrent = useCallback(() => {
    try { handleRef.current?.stop(); } catch {}
    handleRef.current = null;
  }, []);

  const play = useCallback((id: AmbientPresetId) => {
    const builder = PRESETS[id];
    if (!builder) return;

    stopCurrent();
    const { ctx, master } = ensureCtx();
    try {
      handleRef.current = builder(ctx, master);
      setCurrentTrack(id);
      setIsPlaying(true);
    } catch (err) {
      console.warn("Ambient preset failed:", id, err);
      handleRef.current = null;
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  }, [stopCurrent]);

  const pause = useCallback(() => {
    stopCurrent();
    setIsPlaying(false);
  }, [stopCurrent]);

  const toggle = useCallback((id: AmbientPresetId) => {
    if (isPlaying && currentTrack === id) {
      pause();
    } else {
      play(id);
    }
  }, [isPlaying, currentTrack, play, pause]);

  // Reflect volume changes into the master gain immediately.
  useEffect(() => {
    if (masterRef.current && ctxRef.current) {
      masterRef.current.gain.setTargetAtTime(volume, ctxRef.current.currentTime, 0.05);
    }
  }, [volume]);

  // Clean up on unmount — stop any active preset and close the context.
  useEffect(() => {
    return () => {
      try { handleRef.current?.stop(); } catch {}
      handleRef.current = null;
      try { masterRef.current?.disconnect(); } catch {}
      masterRef.current = null;
      try { ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
    };
  }, []);

  return { isPlaying, volume, setVolume, currentTrack, play, pause, toggle };
}

// ───── Typewriter key-click (used by the chapter editor's Focus Mode) ─────
// Synthesised mechanical typewriter thud — unchanged public API.
export function playTypewriterSound(isFocusMode: boolean) {
  if (!isFocusMode) return;
  try {
    const AC: typeof AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(300 + Math.random() * 50, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.04);

    filter.type = "lowpass";
    filter.frequency.value = 1000;

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.04);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
    // Close the short-lived context once the note has faded.
    setTimeout(() => { try { ctx.close(); } catch {} }, 100);
  } catch {}
}
