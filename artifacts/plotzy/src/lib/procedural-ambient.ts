/**
 * Procedural ambient sound library.
 *
 * Every sound is synthesised inside the browser with the Web Audio API — no
 * external audio files and therefore no 404s, no licensing, no CDN cost.
 * Each preset is a tiny factory that wires up a Web Audio graph attached to
 * a shared master gain node and returns a stop() function that cleanly
 * tears the graph down.
 */

export type AmbientPresetId =
  | "rain"
  | "wind"
  | "ocean"
  | "thunderstorm"
  | "fireplace"
  | "crickets"
  | "birds"
  | "cafe"
  | "snow"
  | "train"
  | "white-noise"
  | "brown-noise";

export interface AmbientHandle {
  stop: () => void;
}

// ───── Noise buffers (generated once per AudioContext, cached) ────────────

type NoiseType = "white" | "pink" | "brown";

const noiseCache = new WeakMap<AudioContext, Partial<Record<NoiseType, AudioBuffer>>>();

function getNoiseBuffer(ctx: AudioContext, type: NoiseType): AudioBuffer {
  let bag = noiseCache.get(ctx);
  if (!bag) {
    bag = {};
    noiseCache.set(ctx, bag);
  }
  if (bag[type]) return bag[type]!;

  // 4 seconds of noise — long enough that looping seams aren't audible.
  const frameCount = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  if (type === "white") {
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1;
  } else if (type === "pink") {
    // Paul Kellet refined pink-noise approximation.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  } else {
    // Brown noise = integrated white noise (−6 dB/octave slope).
    let last = 0;
    for (let i = 0; i < frameCount; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }

  bag[type] = buffer;
  return buffer;
}

function noiseSource(ctx: AudioContext, type: NoiseType): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = getNoiseBuffer(ctx, type);
  source.loop = true;
  return source;
}

// ───── Helpers for short synthesised "impulses" (crackles, thunder…) ─────

interface ScheduledTimer {
  cancel: () => void;
}

/**
 * Run `fn` at jittered intervals between [minMs, maxMs] until cancelled.
 * Returned object has a cancel() that guarantees the timer stops even if
 * the user toggles sounds rapidly.
 */
function scheduleRepeating(minMs: number, maxMs: number, fn: () => void): ScheduledTimer {
  let cancelled = false;
  let handle: ReturnType<typeof setTimeout> | null = null;
  const tick = () => {
    if (cancelled) return;
    fn();
    const delay = minMs + Math.random() * (maxMs - minMs);
    handle = setTimeout(tick, delay);
  };
  handle = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
  return {
    cancel: () => {
      cancelled = true;
      if (handle) clearTimeout(handle);
    },
  };
}

/** Short noise pop — used for fireplace crackles, coffee-shop clinks. */
function popNoise(ctx: AudioContext, out: AudioNode, opts: { gain: number; hpFreq?: number; lpFreq?: number; decay?: number }) {
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx, "white");
  const env = ctx.createGain();
  const now = ctx.currentTime;
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(opts.gain, now + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, now + (opts.decay ?? 0.08));

  let last: AudioNode = src;
  if (opts.hpFreq) {
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = opts.hpFreq;
    last.connect(hp);
    last = hp;
  }
  if (opts.lpFreq) {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = opts.lpFreq;
    last.connect(lp);
    last = lp;
  }
  last.connect(env).connect(out);

  // Randomise the buffer start to avoid an audible loop pattern.
  const maxOffset = (src.buffer?.duration ?? 1) - 0.5;
  src.start(now, Math.max(0, Math.random() * maxOffset));
  src.stop(now + (opts.decay ?? 0.08) + 0.05);
}

/** Short sine/triangle chirp — crickets, birds, coffee clinks. */
function chirp(ctx: AudioContext, out: AudioNode, opts: {
  freq: number;
  endFreq?: number;
  type?: OscillatorType;
  gain: number;
  duration: number;
  attack?: number;
}) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const now = ctx.currentTime;
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.endFreq != null) {
    osc.frequency.exponentialRampToValueAtTime(opts.endFreq, now + opts.duration);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(opts.gain, now + (opts.attack ?? 0.01));
  gain.gain.exponentialRampToValueAtTime(0.0001, now + opts.duration);
  osc.connect(gain).connect(out);
  osc.start(now);
  osc.stop(now + opts.duration + 0.05);
}

// ───── Preset builders ────────────────────────────────────────────────────

type Builder = (ctx: AudioContext, master: GainNode) => AmbientHandle;

const buildRain: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "white");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1500;
  bp.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.value = 0.9;
  src.connect(bp).connect(g).connect(master);
  src.start();
  return { stop: () => { src.stop(); src.disconnect(); bp.disconnect(); g.disconnect(); } };
};

const buildWind: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "brown");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  lp.Q.value = 0.8;
  const gustGain = ctx.createGain();
  gustGain.gain.value = 0.8;
  src.connect(lp).connect(gustGain).connect(master);

  // Slow gust modulation — sine LFO around the gust gain
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.2;
  lfoDepth.gain.value = 0.4;
  lfo.connect(lfoDepth).connect(gustGain.gain);
  lfo.start();

  src.start();
  return {
    stop: () => {
      src.stop(); lfo.stop();
      src.disconnect(); lp.disconnect(); gustGain.disconnect(); lfo.disconnect(); lfoDepth.disconnect();
    },
  };
};

const buildOcean: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "pink");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 800;
  bp.Q.value = 0.7;
  const waveGain = ctx.createGain();
  waveGain.gain.value = 0.8;
  src.connect(bp).connect(waveGain).connect(master);

  // Wave cycle ~12s — very slow LFO
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.08;
  lfoDepth.gain.value = 0.55;
  lfo.connect(lfoDepth).connect(waveGain.gain);
  lfo.start();

  src.start();
  return {
    stop: () => {
      src.stop(); lfo.stop();
      src.disconnect(); bp.disconnect(); waveGain.disconnect(); lfo.disconnect(); lfoDepth.disconnect();
    },
  };
};

const buildThunderstorm: Builder = (ctx, master) => {
  // Rain base
  const rain = noiseSource(ctx, "white");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1300;
  bp.Q.value = 0.6;
  const rainGain = ctx.createGain();
  rainGain.gain.value = 0.85;
  rain.connect(bp).connect(rainGain).connect(master);
  rain.start();

  // Random thunder rumbles
  const thunderBus = ctx.createGain();
  thunderBus.gain.value = 1.0;
  thunderBus.connect(master);

  const timer = scheduleRepeating(6000, 20000, () => {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer(ctx, "brown");
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    const env = ctx.createGain();
    const now = ctx.currentTime;
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.9, now + 0.25);
    env.gain.linearRampToValueAtTime(0.6, now + 1.2);
    env.gain.exponentialRampToValueAtTime(0.0001, now + 3);
    src.connect(lp).connect(env).connect(thunderBus);
    const buf = src.buffer;
    const maxOffset = (buf?.duration ?? 1) - 2;
    src.start(now, Math.max(0, Math.random() * maxOffset));
    src.stop(now + 3.1);
  });

  return {
    stop: () => {
      rain.stop();
      rain.disconnect(); bp.disconnect(); rainGain.disconnect();
      timer.cancel();
      thunderBus.disconnect();
    },
  };
};

const buildFireplace: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "brown");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 700;
  const baseGain = ctx.createGain();
  baseGain.gain.value = 0.6;
  src.connect(lp).connect(baseGain).connect(master);
  src.start();

  const crackleBus = ctx.createGain();
  crackleBus.gain.value = 1.0;
  crackleBus.connect(master);

  const timer = scheduleRepeating(80, 600, () => {
    popNoise(ctx, crackleBus, {
      gain: 0.25 + Math.random() * 0.5,
      hpFreq: 2000 + Math.random() * 2000,
      decay: 0.03 + Math.random() * 0.12,
    });
  });

  return {
    stop: () => {
      src.stop();
      src.disconnect(); lp.disconnect(); baseGain.disconnect();
      timer.cancel();
      crackleBus.disconnect();
    },
  };
};

const buildCrickets: Builder = (ctx, master) => {
  // Very soft night-ambience base
  const src = noiseSource(ctx, "brown");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300;
  const bed = ctx.createGain();
  bed.gain.value = 0.25;
  src.connect(lp).connect(bed).connect(master);
  src.start();

  const chirpBus = ctx.createGain();
  chirpBus.gain.value = 0.5;
  chirpBus.connect(master);

  const timer = scheduleRepeating(400, 1100, () => {
    // Each cricket "chirp" is 3-5 fast trill pulses
    const pulses = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < pulses; i++) {
      setTimeout(() => {
        chirp(ctx, chirpBus, {
          freq: 4200 + Math.random() * 600,
          type: "square",
          gain: 0.12,
          duration: 0.04,
          attack: 0.003,
        });
      }, i * 55);
    }
  });

  return {
    stop: () => {
      src.stop();
      src.disconnect(); lp.disconnect(); bed.disconnect();
      timer.cancel();
      chirpBus.disconnect();
    },
  };
};

const buildBirds: Builder = (ctx, master) => {
  // Gentle forest noise bed
  const src = noiseSource(ctx, "pink");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2500;
  bp.Q.value = 0.4;
  const bed = ctx.createGain();
  bed.gain.value = 0.25;
  src.connect(bp).connect(bed).connect(master);
  src.start();

  const birdBus = ctx.createGain();
  birdBus.gain.value = 0.9;
  birdBus.connect(master);

  // Occasional chirps of varied pitch
  const timer = scheduleRepeating(600, 2600, () => {
    const pulses = 2 + Math.floor(Math.random() * 4);
    const base = 1600 + Math.random() * 2400;
    for (let i = 0; i < pulses; i++) {
      setTimeout(() => {
        chirp(ctx, birdBus, {
          freq: base * (0.9 + Math.random() * 0.4),
          endFreq: base * (0.7 + Math.random() * 0.6),
          type: "sine",
          gain: 0.14 + Math.random() * 0.1,
          duration: 0.12 + Math.random() * 0.1,
          attack: 0.01,
        });
      }, i * 90);
    }
  });

  return {
    stop: () => {
      src.stop();
      src.disconnect(); bp.disconnect(); bed.disconnect();
      timer.cancel();
      birdBus.disconnect();
    },
  };
};

const buildCafe: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "brown");
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 600;
  bp.Q.value = 0.3;
  const bed = ctx.createGain();
  bed.gain.value = 0.75;
  src.connect(bp).connect(bed).connect(master);
  src.start();

  const clinkBus = ctx.createGain();
  clinkBus.gain.value = 0.5;
  clinkBus.connect(master);

  const timer = scheduleRepeating(2500, 8000, () => {
    // Random clink: high bell-like chirp
    chirp(ctx, clinkBus, {
      freq: 1800 + Math.random() * 1500,
      type: "triangle",
      gain: 0.1,
      duration: 0.25,
    });
  });

  return {
    stop: () => {
      src.stop();
      src.disconnect(); bp.disconnect(); bed.disconnect();
      timer.cancel();
      clinkBus.disconnect();
    },
  };
};

const buildSnow: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "pink");
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const g = ctx.createGain();
  g.gain.value = 0.7;
  src.connect(hp).connect(g).connect(master);

  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.3;
  lfoDepth.gain.value = 0.25;
  lfo.connect(lfoDepth).connect(g.gain);
  lfo.start();

  src.start();
  return {
    stop: () => {
      src.stop(); lfo.stop();
      src.disconnect(); hp.disconnect(); g.disconnect(); lfo.disconnect(); lfoDepth.disconnect();
    },
  };
};

const buildTrain: Builder = (ctx, master) => {
  const src = noiseSource(ctx, "brown");
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  const bed = ctx.createGain();
  bed.gain.value = 0.9;
  src.connect(lp).connect(bed).connect(master);
  src.start();

  const clackBus = ctx.createGain();
  clackBus.gain.value = 1.0;
  clackBus.connect(master);

  // Rhythmic train-clack pattern: two clacks close together every ~1.3s.
  const timer = scheduleRepeating(1100, 1600, () => {
    const clackOne = () => popNoise(ctx, clackBus, {
      gain: 0.6, lpFreq: 160, decay: 0.08,
    });
    clackOne();
    setTimeout(clackOne, 170);
  });

  return {
    stop: () => {
      src.stop();
      src.disconnect(); lp.disconnect(); bed.disconnect();
      timer.cancel();
      clackBus.disconnect();
    },
  };
};

const buildPlainNoise = (type: NoiseType): Builder => (ctx, master) => {
  const src = noiseSource(ctx, type);
  const g = ctx.createGain();
  // Brown noise needs a lift; white is usually too bright without any taming.
  g.gain.value = type === "white" ? 0.5 : type === "pink" ? 0.7 : 0.9;
  src.connect(g).connect(master);
  src.start();
  return { stop: () => { src.stop(); src.disconnect(); g.disconnect(); } };
};

// ───── Public registry ────────────────────────────────────────────────────

export const PRESETS: Record<AmbientPresetId, Builder> = {
  "rain":         buildRain,
  "wind":         buildWind,
  "ocean":        buildOcean,
  "thunderstorm": buildThunderstorm,
  "fireplace":    buildFireplace,
  "crickets":     buildCrickets,
  "birds":        buildBirds,
  "cafe":         buildCafe,
  "snow":         buildSnow,
  "train":        buildTrain,
  "white-noise":  buildPlainNoise("white"),
  "brown-noise":  buildPlainNoise("brown"),
};
