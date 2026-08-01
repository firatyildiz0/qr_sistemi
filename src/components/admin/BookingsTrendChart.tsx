"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

export type TrendPoint = {
  /** YYYY-MM-DD */
  date: string;
  value: number;
};

type Props = {
  points: TrendPoint[];
  /** Describes the measure, e.g. "aktif rezervasyon". Used in the tooltip and table. */
  unitLabel: string;
};

const HEIGHT = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 36 };

const dayFormatter = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const fullFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  weekday: "long",
});

function parseDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Monotone cubic interpolation (the curveMonotoneX algorithm): a smooth curve
 * that never overshoots its data points, so a count series can't dip below zero
 * between two samples the way a plain Catmull-Rom spline would.
 */
function curvePath(pts: { x: number; y: number }[]) {
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
function niceMax(max: number) {
  if (max <= 4) return Math.max(4, max);
  const pow = 10 ** Math.floor(Math.log10(max));
  for (const step of [1, 2, 2.5, 5, 10]) {
    const candidate = step * pow;
    if (candidate >= max) return candidate;
  }
  return max;
}

export default function BookingsTrendChart({ points, unitLabel }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(320, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const top = niceMax(Math.max(...points.map((p) => p.value), 0));

  const xAt = (i: number) =>
    PAD.left + (points.length < 2 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => PAD.top + innerH - (top === 0 ? 0 : (v / top) * innerH);

  const coords = points.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const line = curvePath(coords);
  const area = line
    ? `${line} L${coords[coords.length - 1].x},${PAD.top + innerH} L${coords[0].x},${PAD.top + innerH} Z`
    : "";

  // Yinelenenler eleniyor: `top` 0 ya da 1 iken üç kesir de aynı sayıya
  // yuvarlanıyor ([0,0,0] ve [0,1,1]). Aynı çizgiyi üst üste çizmenin anlamı
  // yok, üstelik değerler `key` olarak kullanıldığı için React tekrarlanan
  // anahtar uyarısı veriyordu.
  const ticks = [...new Set([0, 0.5, 1].map((f) => Math.round(top * f)))];
  const labelStep = Math.max(1, Math.ceil(points.length / 6));

  const onMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left - PAD.left;
      const ratio = innerW <= 0 ? 0 : x / innerW;
      const index = Math.round(ratio * (points.length - 1));
      setHover(Math.min(points.length - 1, Math.max(0, index)));
    },
    [innerW, points.length],
  );

  const active = hover === null ? null : points[hover];
  const total = points.reduce((sum, p) => sum + p.value, 0);
  const peak = points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-ink">Rezervasyon eğrisi</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Son {points.length} günde günlük {unitLabel}
          </p>
        </div>
        <p className="text-sm text-ink-muted">
          En yoğun gün:{" "}
          <span className="font-semibold text-ink">
            {peak ? `${dayFormatter.format(parseDay(peak.date))} · ${peak.value}` : "—"}
          </span>
        </p>
      </div>

      <div ref={wrapRef} className="relative mt-5">
        <svg
          role="img"
          aria-label={`Son ${points.length} günün günlük ${unitLabel} eğrisi. Toplam ${total}.`}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          className="block w-full touch-none"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke="var(--color-border)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={yAt(t) + 4}
                textAnchor="end"
                className="fill-ink-muted text-[11px]"
              >
                {t}
              </text>
            </g>
          ))}

          {points.map((p, i) =>
            i % labelStep === 0 || i === points.length - 1 ? (
              <text
                key={p.date}
                x={xAt(i)}
                y={HEIGHT - 8}
                textAnchor={i === points.length - 1 ? "end" : "middle"}
                className="fill-ink-muted text-[11px]"
              >
                {dayFormatter.format(parseDay(p.date))}
              </text>
            ) : null,
          )}

          {area && <path d={area} fill="url(#trend-fill)" />}
          {line && (
            <path
              d={line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {hover !== null && (
            <g>
              <line
                x1={coords[hover].x}
                x2={coords[hover].x}
                y1={PAD.top}
                y2={PAD.top + innerH}
                stroke="var(--color-accent)"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.5"
              />
              <circle
                cx={coords[hover].x}
                cy={coords[hover].y}
                r="5"
                fill="var(--color-accent)"
                stroke="var(--color-card)"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 rounded-md border border-border bg-card px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(width - 70, Math.max(70, coords[hover!].x)),
              top: Math.max(0, coords[hover!].y - 58),
            }}
          >
            <div className="font-semibold text-ink">{active.value} {unitLabel}</div>
            <div className="mt-0.5 whitespace-nowrap text-ink-muted">
              {fullFormatter.format(parseDay(active.date))}
            </div>
          </div>
        )}
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-ink-muted">Verileri tablo olarak gör</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 font-medium">Tarih</th>
                <th className="py-1 font-medium">{unitLabel}</th>
              </tr>
            </thead>
            <tbody className="text-ink">
              {points.map((p) => (
                <tr key={p.date} className="border-t border-border">
                  <td className="py-1">{fullFormatter.format(parseDay(p.date))}</td>
                  <td className="py-1">{p.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
