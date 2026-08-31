/** SVG path 'd' string for a 5-point star centered at (cx, cy). */
export function starPath(cx: number, cy: number, outerRadius: number, innerRadius: number): string {
  const points: string[] = [];
  const step = Math.PI / 5;
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + i * step;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `${points.join(' ')} Z`;
}
