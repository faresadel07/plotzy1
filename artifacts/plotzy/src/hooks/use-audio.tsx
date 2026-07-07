import { useCallback, useEffect, useRef, useState } from "react";
import { PRESETS, type AmbientHandle, type AmbientPresetId } from "@/lib/procedural-ambient";
import { AMBIENT_FILES } from "@/lib/ambient-files";

/**
 * Ambient-soundscape hook.
 *
 * Naturalistic sounds (rain, ocean, fire, birds, cafe, ...) play from real
 * recorded loops in public/sounds/ambient, layered where it helps (a
 * thunderstorm is a rain bed under rolling thunder). White and brown noise
 * stay synthesised via lib/procedural-ambient because they are already
 * mathematically clean. One preset plays at a time with a master volume
 * slider and a clean teardown on unmount / toggle. Recorded loops are
 * fetched only on the first user-triggered play, so nothing loads until a
 * sound is chosen.
 */
export function useAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentTrack, setCurrentTrack] = useState<AmbientPresetId | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const handleRef = useRef<AmbientHandle | null>(null);
  // Active <audio> elements for file-based (recorded) presets.
  const audioElsRef = useRef<HTMLAudioElement[]>([]);

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
    // Procedural graph.
    try { handleRef.current?.stop(); } catch {}
    handleRef.current = null;
    // Recorded loops.
    for (const el of audioElsRef.current) {
      try { el.pause(); el.src = ""; el.load(); } catch {}
    }
    audioElsRef.current = [];
  }, []);

  const play = useCallback((id: AmbientPresetId) => {
    stopCurrent();

    // Recorded loops (naturalistic sounds) take precedence.
    const files = AMBIENT_FILES[id];
    if (files && files.length) {
      try {
        audioElsRef.current = files.map((src) => {
          const el = new Audio(src);
          el.loop = true;
          el.preload = "auto";
          el.volume = volume;
          void el.play().catch(() => {});
          return el;
        });
        setCurrentTrack(id);
        setIsPlaying(true);
      } catch {
        stopCurrent();
        setIsPlaying(false);
        setCurrentTrack(null);
      }
      return;
    }

    // Fall back to synthesis (white / brown noise).
    const builder = PRESETS[id];
    if (!builder) return;
    const { ctx, master } = ensureCtx();
    try {
      handleRef.current = builder(ctx, master);
      setCurrentTrack(id);
      setIsPlaying(true);
    } catch {
      handleRef.current = null;
      setIsPlaying(false);
      setCurrentTrack(null);
    }
  }, [stopCurrent, volume]);

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
    for (const el of audioElsRef.current) el.volume = volume;
  }, [volume]);

  // Clean up on unmount — stop any active preset and close the context.
  useEffect(() => {
    return () => {
      try { handleRef.current?.stop(); } catch {}
      handleRef.current = null;
      for (const el of audioElsRef.current) {
        try { el.pause(); el.src = ""; el.load(); } catch {}
      }
      audioElsRef.current = [];
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
//
// Reuses a single AudioContext across every keystroke. Creating a fresh
// context per keystroke (old behaviour) was wasteful and hit the browser's
// hard cap of ~4-6 concurrent AudioContexts per tab during fast typing,
// after which creation threw and the editor fell silent.
let typewriterCtx: AudioContext | null = null;
function getTypewriterCtx(): AudioContext | null {
  if (typewriterCtx && typewriterCtx.state !== "closed") return typewriterCtx;
  const AC: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  typewriterCtx = new AC();
  return typewriterCtx;
}

export function playTypewriterSound(isFocusMode: boolean) {
  if (!isFocusMode) return;
  try {
    const ctx = getTypewriterCtx();
    if (!ctx) return;
    // Browsers suspend AudioContext until a user gesture; keystrokes qualify.
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

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
    // Nodes disconnect themselves via GC once stopped — no manual teardown.
  } catch {}
}
