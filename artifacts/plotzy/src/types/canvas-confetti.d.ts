// Minimal type declarations for `canvas-confetti` v1.9.x. The library
// ships no bundled types and we don't add @types/canvas-confetti to
// keep the dependency surface small. Only the surface we actually
// call is typed here — extend if/when more is used.
declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    angle?: number;
    startVelocity?: number;
    decay?: number;
    gravity?: number;
    drift?: number;
    ticks?: number;
    origin?: { x?: number; y?: number };
    colors?: string[];
    shapes?: ("square" | "circle")[];
    scalar?: number;
    zIndex?: number;
    disableForReducedMotion?: boolean;
  }
  function confetti(opts?: ConfettiOptions): Promise<void> | null;
  export default confetti;
}
