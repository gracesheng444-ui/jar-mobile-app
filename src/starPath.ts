export interface StarGeometry {
  path: string;
  points: { x: number; y: number }[];
}

/** Inner/outer radius ratio for a classic, evenly-pointed 5-point star. */
export const STAR_INNER_RATIO = 0.45;

/**
 * Regular 5-point star: 10 vertices alternating between outer and inner
 * radius, traced as a single non-self-crossing outline. Unlike a pentagram
 * traced by connecting every other point (which self-intersects and reads as
 * lumpy once stroked — some arms look thicker than others where lines
 * overlap), this shape is geometrically symmetric at any size or stroke
 * width, so every point comes out even.
 */
export function starGeometry(cx: number, cy: number, outerRadius: number, rotationDeg = 0): StarGeometry {
  const rotationRad = (rotationDeg * Math.PI) / 180;
  const innerRadius = outerRadius * STAR_INNER_RATIO;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + rotationRad + i * (Math.PI / 5);
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  const path = `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} Z`;
  return { path, points };
}
