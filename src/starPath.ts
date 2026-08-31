export interface StarGeometry {
  path: string;
  points: { x: number; y: number }[];
}

/** 5-point star centered at (cx, cy), plus its vertices for drawing origami fold-crease lines. */
export function starGeometry(cx: number, cy: number, outerRadius: number, innerRadius: number): StarGeometry {
  const points: { x: number; y: number }[] = [];
  const step = Math.PI / 5;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * step;
    points.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  const path = `${points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')} Z`;
  return { path, points };
}
