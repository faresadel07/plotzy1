import { useState, useEffect, useRef, useCallback } from 'react';

export function useAudio() {
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.5);
    const [currentTrack, setCurrentTrack] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
            }
        };
    }, []);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const play = useCallback((url: string) => {
        if (!audioRef.current) return;

        if (currentTrack !== url) {
            audioRef.current.src = url;
            setCurrentTrack(url);
        }

        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        setIsPlaying(true);
    }, [currentTrack]);

    const pause = useCallback(() => {
        if (!audioRef.current) return;
        audioRef.current.pause();
        setIsPlaying(false);
    }, []);

    const toggle = useCallback((url: string) => {
        if (isPlaying && currentTrack === url) {
            pause();
        } else {
            play(url);
        }
    }, [isPlaying, currentTrack, play, pause]);

    return { isPlaying, volume, setVolume, currentTrack, play, pause, toggle };
}

// Synthesized mechanical typewriter beep/thud effect
export function playTypewriterSound(isFocusMode: boolean) {
    if (!isFocusMode) return;

    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        // Simulate a dull click/thud of a mechanical keyboard
        osc.type = 'triangle';
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
    } catch (e) { }
}
