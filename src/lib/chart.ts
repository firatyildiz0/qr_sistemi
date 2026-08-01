/**
 * Grafiklerin ortak geometrisi. İki ayrı grafik (satıcı panelindeki rezervasyon
 * eğrisi ve yönetim panelindeki istatistikler) aynı iki hesabı yapıyordu.
 */

/**
 * Monotone cubic interpolation (the curveMonotoneX algorithm): a smooth curve
 * that never overshoots its data points, so a count series can't dip below zero
 * between two samples the way a plain Catmull-Rom spline would.
 */
export function curvePath(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0].x},${pts[0].y}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  const t: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i += 1) {
    if (slope[i - 1] * slope[i] <= 0) {
      t[i] = 0;
    } else {
      const w1 = 2 * dx[i] + dx[i - 1];
      const w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / slope[i - 1] + w2 / slope[i]);
    }
  }
  t[n - 1] = slope[n - 2];

  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = dx[i] / 3;
    d += ` C${pts[i].x + h},${pts[i].y + h * t[i]} ${pts[i + 1].x - h},${pts[i + 1].y - h * t[i + 1]} ${pts[i + 1].x},${pts[i + 1].y}`;
  }
  return d;
}

/** Rounds a maximum up to a friendly axis top (1, 2, 5 × 10^n). */
export function niceMax(max: number) {
  if (max <= 4) return Math.max(4, max);
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * pow;
    if (candidate >= max) return candidate;
  }
  return max;
}

/** "YYYY-MM-DD" → yerel saatte Date. `new Date(iso)` bunu UTC sayardı. */
export function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Üstü yuvarlatılmış, tabanı düz sütun. Yuvarlaklık sütunun kendi boyundan
 * büyük olamaz, yoksa kısa sütunlar mantar gibi görünür.
 */
export function columnPath(x: number, y: number, width: number, baseline: number) {
  const height = baseline - y;
  const r = Math.max(0, Math.min(4, width / 2, height));

  return [
    `M${x},${baseline}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${baseline}`,
    "Z",
  ].join(" ");
}
