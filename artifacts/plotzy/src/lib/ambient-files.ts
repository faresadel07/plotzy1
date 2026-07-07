// Real recorded ambient loops that replace the synthesised presets for
// the naturalistic sounds. Files live in public/sounds/ambient and are
// fetched only when a preset is played. Sourced from the open-source
// Moodist collection (github.com/remvze/moodist), under CC0 and the
// Pixabay Content License, both of which permit embedding the sounds in
// an app like this.
//
// White noise and brown noise stay procedural (see procedural-ambient):
// they are mathematically exact and already clean, so there is nothing
// a recording would improve.

import type { AmbientPresetId } from "./procedural-ambient";

const B = import.meta.env.BASE_URL;
const f = (name: string) => `${B}sounds/ambient/${name}`;

// A preset can map to one or more layered loops (thunderstorm = rain
// bed plus rolling thunder).
export const AMBIENT_FILES: Partial<Record<AmbientPresetId, string[]>> = {
  rain: [f("heavy-rain.mp3")],
  wind: [f("wind-in-trees.mp3")],
  ocean: [f("waves.mp3")],
  thunderstorm: [f("heavy-rain.mp3"), f("thunder.mp3")],
  fireplace: [f("campfire.mp3")],
  crickets: [f("crickets.mp3")],
  birds: [f("birds.mp3")],
  cafe: [f("cafe.mp3")],
  snow: [f("howling-wind.mp3")],
  train: [f("inside-a-train.mp3")],
};
