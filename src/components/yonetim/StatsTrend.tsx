"use client";

import { useEffect, useRef, useState } from "react";
import { columnPath, niceMax, parseDay } from "@/lib/chart";
import type { Bucket, Period } from "@/lib/stats";

type Props = {
  points: Bucket[];
  period: Period;
};

/**
 * Üç ölçünün zaman içindeki seyri.
 *
 * Üçü tek eksende değil, alt alta üç ayrı panelde: okutma sayısı ürün ekleme
 * sayısının kat kat üstünde olduğu için aynı eksene konsalar alttaki iki seri
 * sıfır çizgisine yapışık düz bir çizgi olurdu. İki ayrı y ekseni de bilinçli
 * olarak yok — aynı grafikte iki farklı ölçek okuyucuyu yanıltır. Panellerin x
 * ekseni ortak, imleç üçünde birden aynı kovayı işaretliyor.
 */

const SERIES = [
  { key: "scans", label: "QR okutma", color: "var(--color-viz-1)" },
  { key: "products", label: "Eklenen ürün", color: "var(--color-viz-2)" },
  { key: "bookings", label: "Rezervasyon", color: "var(--color-viz-3)" },
] as const;

const PLOT_H = 104;
const AXIS_H = 22;
const PAD = { top: 10, right: 8, bottom: 4, left: 32 };

const shortDay = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  weekday: "long",
});
const shortMonth = new Intl.DateTimeFormat("tr-TR", { month: "short" });
const longMonth = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });

function shortLabel(iso: string, period: Period) {
  const date = parseDay(iso);
  return period === "ay" ? shortMonth.format(date) : shortDay.format(date);
}

function longLabel(iso: string, period: Period) {
  const date = parseDay(iso);
  if (period === "ay") return longMonth.format(date);
  if (period === "hafta") return `${shortDay.format(date)} haftası`;
  return longDay.format(date);
}

export default function StatsTrend({ points, period }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (points.length === 0) return null;

  // İmleç bir kovanın üstünde değilken okunan şey son kova: kart hiçbir zaman
  // boş bir okuma satırıyla durmuyor.
  const activeIndex = hover ?? points.length - 1;
  const active = points[activeIndex];

  const innerW = Math.max(40, width - PAD.left - PAD.right);
  const band = innerW / points.length;
  const barW = Math.max(2, Math.min(24, band - 6));
  const xAt = (i: number) => PAD.left + i * band + (band - barW) / 2;
  const labelStep = Math.max(1, Math.ceil(points.length / (width < 480 ? 4 : 7)));

  return (
    <div className="card">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-lg font-bold text-ink">Zaman içindeki hareket</h2>
        <p className="text-sm text-ink-muted">
          {hover === null ? "Son dönem" : "Seçili dönem"}:{" "}
          <span className="font-semibold text-ink">{longLabel(active.date, period)}</span>
        </p>
      </div>

      {/* Okuma satırı. Üstte yüzen bir balon yerine sabit bir satır: imleç
          hangi kovanın üstündeyse üç değeri birden burada gösteriyor, hiçbir
          şeyin üstünü örtmüyor ve dokunmatik ekranda da yerinde duruyor. */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-border pb-4">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-sm text-ink-muted">{s.label}</span>
            <span className="count-up text-sm font-semibold text-ink">
              {active[s.key].toLocaleString("tr-TR")}
            </span>
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="mt-4" onPointerLeave={() => setHover(null)}>
        {SERIES.map((s, facet) => {
          const values = points.map((p) => p[s.key]);
          const top = niceMax(Math.max(...values, 0));
          const isLast = facet === SERIES.length - 1;
          const height = PLOT_H + (isLast ? AXIS_H : 0);
          const baseline = PLOT_H - PAD.bottom;
          const yAt = (v: number) =>
            baseline - (top === 0 ? 0 : (v / top) * (baseline - PAD.top));
          const total = values.reduce((sum, v) => sum + v, 0);

          return (
            <div key={s.key} className={facet > 0 ? "mt-5" : ""}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="text-sm font-semibold text-ink">{s.label}</span>
                </div>
                <span className="text-xs text-ink-muted">
                  dönem toplamı{" "}
                  <span className="count-up font-semibold text-ink">
                    {total.toLocaleString("tr-TR")}
                  </span>
                </span>
              </div>

              <svg
                role="img"
                aria-label={`${s.label}: son ${points.length} dönemin dağılımı, toplam ${total}.`}
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                className="mt-1 block w-full touch-none"
              >
                {/* Tavan ve taban çizgisi: aradaki her sütunun değeri okuma
                    satırından ve tablodan okunabildiği için daha fazla ızgara
                    çizgisi yalnızca gürültü olurdu. */}
                {[top, 0].map((tick) => (
                  <g key={tick}>
                    <line
                      x1={PAD.left}
                      x2={width - PAD.right}
                      y1={yAt(tick)}
                      y2={yAt(tick)}
                      stroke="var(--color-border)"
                      strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 6}
                      y={yAt(tick) + 4}
                      textAnchor="end"
                      className="fill-ink-muted text-[10px] tabular-nums"
                    >
                      {tick.toLocaleString("tr-TR")}
                    </text>
                  </g>
                ))}

                {/* Seçili kova, sütunların *arkasında* duran nötr bir şerit.
                    Sütunun içinden geçen bir kesik çizgi aynı işi görürdü ama
                    yüksek sütunlarda verinin üstünü çizerdi. */}
                {hover !== null && (
                  <rect
                    x={PAD.left + activeIndex * band}
                    y={PAD.top - 6}
                    width={band}
                    height={baseline - PAD.top + 6}
                    fill="var(--color-border)"
                    opacity="0.5"
                  />
                )}

                {points.map((p, i) => {
                  const value = p[s.key];
                  const isActive = i === activeIndex;

                  return (
                    <g key={p.date}>
                      {value > 0 && (
                        <path
                          d={columnPath(xAt(i), yAt(value), barW, baseline)}
                          fill={s.color}
                          opacity={hover === null || isActive ? 1 : 0.45}
                        />
                      )}
                      {/* Sıfır değerli kovanın da bir izi olsun: sütun yok ama
                          o dönemin ölçüldüğü belli olsun diye ince bir çentik. */}
                      {value === 0 && (
                        <line
                          x1={xAt(i)}
                          x2={xAt(i) + barW}
                          y1={baseline}
                          y2={baseline}
                          stroke="var(--color-border-strong)"
                          strokeWidth="2"
                        />
                      )}
                      {/* Dokunma/imleç hedefi sütundan geniş: 2 piksellik bir
                          sütunu parmakla yakalamak imkânsız olurdu. */}
                      <rect
                        x={PAD.left + i * band}
                        y={0}
                        width={band}
                        height={PLOT_H}
                        fill="transparent"
                        onPointerEnter={() => setHover(i)}
                      />
                    </g>
                  );
                })}

                {isLast &&
                  points.map((p, i) =>
                    // Son kova her zaman etiketli; ondan bir adım öncesine denk
                    // gelen ara etiket atlanıyor, yoksa iki yazı üst üste biner.
                    i === points.length - 1 ||
                    (i % labelStep === 0 && points.length - 1 - i >= labelStep) ? (
                      <text
                        key={p.date}
                        x={xAt(i) + barW / 2}
                        y={height - 6}
                        textAnchor={
                          i === points.length - 1
                            ? "end"
                            : i === 0
                              ? "start"
                              : "middle"
                        }
                        className="fill-ink-muted text-[11px]"
                      >
                        {shortLabel(p.date, period)}
                      </text>
                    ) : null,
                  )}
              </svg>
            </div>
          );
        })}
      </div>

      <details className="mt-5">
        <summary className="cursor-pointer text-sm text-ink-muted">
          Verileri tablo olarak gör
        </summary>
        <div className="mt-3 max-h-72 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-ink-muted">
              <tr>
                <th className="py-1 font-medium">Dönem</th>
                {SERIES.map((s) => (
                  <th key={s.key} className="py-1 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-ink">
              {[...points].reverse().map((p) => (
                <tr key={p.date} className="border-t border-border">
                  <td className="py-1 pr-3">{longLabel(p.date, period)}</td>
                  {SERIES.map((s) => (
                    <td key={s.key} className="py-1 text-right tabular-nums">
                      {p[s.key].toLocaleString("tr-TR")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
