import { JAR_USABLE_HEIGHT, JAR_USABLE_WIDTH } from './jarGeometry';

/** Flat doodle-marker colors users can pick for their own star. */
export const DOODLE_PALETTE = ['#FFC94A', '#7FD1D9', '#F06A9C', '#9B8CE0', '#8FCB7E'];

const MAX_STAR_SIZE = 30;
const MIN_STAR_SIZE = 8;
const PACKING_EFFICIENCY = 0.7; // stars are round-ish, piled with some overlap, not a perfect grid — see starPile.ts

/**
 * Picks countdown mode's fixed star size from the jar's total capacity, so a
 * months-long countdown (hundreds of stars) still fits the jar's fixed
 * visual area instead of spilling out of it. Computed once at jar creation
 * from a value (capacity) that is itself fixed at creation — so this stays
 * "fixed once, never recalculated" even though it now depends on capacity
 * instead of being a flat constant.
 */
export function starSizeForCapacity(capacity: number): number {
  const areaPerStar = (JAR_USABLE_WIDTH * JAR_USABLE_HEIGHT * PACKING_EFFICIENCY) / capacity;
  const box = Math.sqrt(areaPerStar);
  const size = box / 1.4; // Star.tsx renders its own box at size * 1.4
  return Math.min(MAX_STAR_SIZE, Math.max(MIN_STAR_SIZE, size));
}

/** Deterministic pick from a user id, so two freshly-paired partners default to different colors. */
export function defaultStarColorFor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return DOODLE_PALETTE[hash % DOODLE_PALETTE.length];
}
