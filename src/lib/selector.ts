/**
 * Question selection with round-robin interleaving and optional seeded shuffle.
 *
 * Requirements: 4.1, 4.4, 4.5, 4.6, 4.7
 */
import type { Question } from './schema.js';
import { createPrng } from './prng.js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fisher-Yates in-place shuffle using the provided PRNG.
 */
function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Group questions by their `category` field, preserving insertion order of
 * first appearance so the interleave is deterministic when no seed is provided.
 */
function groupByCategory(questions: Question[]): Map<string, Question[]> {
  const map = new Map<string, Question[]>();
  for (const q of questions) {
    const bucket = map.get(q.category);
    if (bucket) {
      bucket.push(q);
    } else {
      map.set(q.category, [q]);
    }
  }
  return map;
}

/**
 * Round-robin interleave: draw one question from each category bucket in turn
 * until `needed` questions have been collected or all buckets are empty.
 *
 * This ensures no single category exhausts before others draw proportionally.
 */
function roundRobinSelect(
  buckets: Map<string, Question[]>,
  needed: number
): Question[] {
  // Convert to an array of mutable queues
  const queues: Question[][] = Array.from(buckets.values()).map((b) => [...b]);
  const result: Question[] = [];

  while (result.length < needed) {
    let anyDrawn = false;
    for (const queue of queues) {
      if (result.length >= needed) break;
      if (queue.length > 0) {
        result.push(queue.shift()!);
        anyDrawn = true;
      }
    }
    // Safety valve — if no bucket had anything left, stop
    if (!anyDrawn) break;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Select up to `count` unique questions from `pool`.
 *
 * - No duplicate `questionId` values in the result.
 * - When `seed` is provided the selection and ordering are deterministic.
 * - Round-robin across categories so no category exhausts before others draw
 *   proportionally (Req 4.7).
 * - Returns `min(count, pool.length)` questions; returns the entire pool when
 *   pool is smaller than `count` (Req 4.6).
 */
export function selectQuestions(
  pool: Question[],
  count: number | 'all',
  seed: number | null
): Question[] {
  if (pool.length === 0) return [];

  const needed = count === 'all' ? pool.length : Math.min(count, pool.length);

  // Work on a copy so we never mutate the caller's array
  const workingPool = [...pool];

  // If a seed is provided, shuffle each category bucket independently so that
  // within each category the draw order is random but reproducible.
  if (seed !== null) {
    const rng = createPrng(seed);
    // Shuffle the whole pool first to randomise inter-category ordering within
    // the round-robin; then re-group so the buckets themselves are shuffled.
    shuffleArray(workingPool, rng);
  }

  const buckets = groupByCategory(workingPool);

  // If seed provided, also shuffle within each bucket for intra-category
  // randomness (the whole-pool shuffle above already mixed things, but an
  // explicit per-bucket shuffle makes the distribution more uniform).
  if (seed !== null) {
    const rng2 = createPrng(seed ^ 0xdeadbeef);
    for (const bucket of buckets.values()) {
      shuffleArray(bucket, rng2);
    }
  }

  const selected = roundRobinSelect(buckets, needed);

  // Final shuffle of the selected set when a seed is provided so the
  // presentation order is also randomised (not just the per-category draw).
  if (seed !== null) {
    const rng3 = createPrng(seed ^ 0xcafebabe);
    shuffleArray(selected, rng3);
  }

  return selected;
}
