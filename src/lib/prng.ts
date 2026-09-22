/**
 * Mulberry32 seedable pseudo-random number generator.
 *
 * Returns a closure that yields deterministic floats in [0, 1) given an
 * initial seed. The same seed always produces the same sequence.
 *
 * Requirements: 4.4, 4.5
 */
export function createPrng(seed: number): () => number {
  let s = seed >>> 0; // coerce to unsigned 32-bit integer

  return function (): number {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    t = (t ^ (t >>> 14)) >>> 0;
    return t / 0x100000000;
  };
}
