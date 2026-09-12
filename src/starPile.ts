export interface StarPosition {
  /** Center x, in the same RN unit space as jarGeometry's bounds. */
  x: number;
  /** Center y. */
  y: number;
  rotation: number;
}

/** Deterministic per-index PRNG (mulberry32) — a star's placement is a pure
 *  function of its index, so it never reshuffles as later stars are added. */
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// How many random x candidates each star tries before settling — trying just
// one (pure "drop straight down at a random x") lets random chance start a
// tower at one x and then keeps stacking new stars on its peak instead of
// the wide-open floor elsewhere, since nothing favors the low gaps. Trying
// several and keeping whichever lands deepest fixes that while keeping the
// placement random rather than a fixed grid.
const CANDIDATES_PER_STAR = 6;

/**
 * Lays stars out as if they'd actually been dropped in one at a time and
 * piled up — each one tries a few random x spots, "falling" straight down
 * each time until it would hit the floor or an earlier star, and keeps
 * whichever spot lands deepest — instead of a tidy row-by-row grid. Plain 2D
 * circle packing, not real physics, but reads as a believable pile: stars
 * reach the side walls, nestle into the gaps between each other, and spread
 * into a mound rather than random spindly towers.
 */
export function computeStarPile(
  count: number,
  starSize: number,
  bounds: { left: number; right: number; floorY: number; cornerStartY: number; floorLeft: number; floorRight: number }
): StarPosition[] {
  // The star's true max reach from its own center — every one of its 5 outer
  // points sits at exactly this radius, regardless of which way a given
  // star's random rotation happens to point one of them. Floor and wall
  // contact must use *this* radius, or a point can rotate to face straight
  // down/sideways and poke past the line. Star-to-star packing uses a
  // smaller radius on purpose (below), so neighbors can overlap like an
  // actual pile — but that smaller radius must never leak into the
  // floor/wall checks, which is exactly what let stars sit slightly past
  // the floor line before this fix.
  const trueRadius = starSize / 2;
  const packRadius = trueRadius * 0.82;
  const usableWidth = Math.max(0, bounds.right - bounds.left - trueRadius * 2);
  const placed: { x: number; y: number }[] = [];
  const positions: StarPosition[] = [];

  const restYAt = (x: number): number => {
    let restY = bounds.floorY - trueRadius;
    for (const p of placed) {
      const dx = x - p.x;
      const span = packRadius * 2;
      if (Math.abs(dx) < span) {
        const candidateY = p.y - Math.sqrt(span * span - dx * dx);
        if (candidateY < restY) restY = candidateY;
      }
    }
    return restY;
  };

  // Below cornerStartY the side walls curve inward to the floor's own narrower span (see
  // jarGeometry's JAR_FLOOR_LEFT/RIGHT) — a star resting that deep has to be pulled in from
  // whichever x it was randomly dropped at, or it renders poking out past the drawn curve.
  const wallAt = (y: number): { left: number; right: number } => {
    if (y <= bounds.cornerStartY) return { left: bounds.left, right: bounds.right };
    const t = Math.min(1, (y - bounds.cornerStartY) / (bounds.floorY - bounds.cornerStartY));
    return {
      left: bounds.left + (bounds.floorLeft - bounds.left) * t,
      right: bounds.right + (bounds.floorRight - bounds.right) * t,
    };
  };

  for (let i = 0; i < count; i++) {
    const rand = seededRandom(i * 2654435761 + 1);

    let bestX = bounds.left + trueRadius;
    let bestY = -Infinity; // larger y = deeper/lower in the jar; start below any real candidate
    for (let c = 0; c < CANDIDATES_PER_STAR; c++) {
      let x = bounds.left + trueRadius + rand() * usableWidth;
      let y = restYAt(x);
      const wall = wallAt(y);
      const lo = wall.left + trueRadius;
      const hi = Math.max(lo, wall.right - trueRadius);
      const clampedX = Math.min(Math.max(x, lo), hi);
      if (clampedX !== x) {
        x = clampedX;
        y = restYAt(x);
      }
      if (y > bestY) {
        bestY = y;
        bestX = x;
      }
    }

    const rotation = (rand() - 0.5) * 70; // wide enough to read as "tossed in", not just a nudge
    placed.push({ x: bestX, y: bestY });
    positions.push({ x: bestX, y: bestY, rotation });
  }

  return positions;
}
