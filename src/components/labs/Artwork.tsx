"use client";

import { useId } from "react";

/**
 * Ana sayfadaki hizmet görselleri.
 *
 * Hepsi tek reçeteyle çiziliyor: derin çift tonlu zemin, iki yumuşak ışık
 * kaynağı, merkezde ince çizgili bir motif ve üstünde film greni. Böylece
 * dokuz kart yan yana geldiğinde bir renk şenliği değil, aynı ailenin ton
 * farkları okunuyor. Fotoğraf kullanılmıyor: ürünlerin fotoğrafı satıcıdan
 * satıcıya değişiyor, vitrinin görseli değişmemeli.
 */

export type Tone = "yosun" | "denizci" | "kil" | "mor" | "gul" | "turkuaz";
export type Motif = "qr" | "takvim" | "kup" | "etiket" | "dalga" | "vizor" | "kopru" | "grafik" | "para";

const TONES: Record<Tone, { base: string; deep: string; l1: string; l2: string; mo: string }> = {
  yosun: { base: "#06302a", deep: "#031c19", l1: "#2fd39c", l2: "#0d7d62", mo: "214,255,240" },
  denizci: { base: "#08243c", deep: "#04121f", l1: "#5cb4f2", l2: "#12557f", mo: "219,240,255" },
  kil: { base: "#3a1a0c", deep: "#1e0d05", l1: "#ff9b52", l2: "#a44a17", mo: "255,235,220" },
  mor: { base: "#221540", deep: "#120a24", l1: "#a184ff", l2: "#523a9e", mo: "233,226,255" },
  gul: { base: "#3a1424", deep: "#1e0a13", l1: "#ff8296", l2: "#993049", mo: "255,226,232" },
  turkuaz: { base: "#052f32", deep: "#031a1c", l1: "#46cfc4", l2: "#0d7078", mo: "216,255,252" },
};

/** Motifler merkeze göre çiziliyor; ölçeği kapsayıcı veriyor. */
function motifOf(motif: Motif, c: (alpha: number) => string) {
  switch (motif) {
    case "qr":
      return (
        <g transform="translate(-58 -58)">
          <rect x="0" y="0" width="116" height="116" rx="22" fill="none" stroke={c(0.5)} strokeWidth="1.6" />
          <g fill={c(0.92)}>
            <rect x="20" y="20" width="24" height="24" rx="7" />
            <rect x="72" y="20" width="24" height="24" rx="7" />
            <rect x="20" y="72" width="24" height="24" rx="7" />
          </g>
          <g fill={c(0.55)}>
            <rect x="54" y="54" width="14" height="14" rx="4" />
            <rect x="78" y="78" width="12" height="12" rx="3.5" />
            <rect x="54" y="86" width="10" height="10" rx="3" />
          </g>
        </g>
      );
    case "takvim": {
      const rows = [
        { x: -92, y: -46, w: 150 },
        { x: -60, y: -14, w: 96 },
        { x: -78, y: 18, w: 132 },
        { x: -40, y: 50, w: 74 },
      ];
      return (
        <g>
          {rows.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.w} height="16" rx="8" fill={c(i === 1 ? 0.9 : 0.35)} />
          ))}
          <line x1="14" y1="-78" x2="14" y2="82" stroke={c(0.45)} strokeWidth="1.4" strokeDasharray="4 6" />
        </g>
      );
    }
    case "kup":
      return (
        <g>
          <g fill="none" stroke={c(0.68)} strokeWidth="1.8" strokeLinejoin="round">
            <path d="M0-72 62-36v72L0 72-62 36v-72z" />
            <path d="M-62-36 0 0l62-36M0 0v72" />
          </g>
          <circle cx="0" cy="0" r="5" fill={c(0.9)} />
        </g>
      );
    case "etiket":
      return (
        <g>
          <rect x="-84" y="-58" width="96" height="96" rx="20" fill={c(0.1)} stroke={c(0.42)} strokeWidth="1.5" />
          <rect x="-44" y="-38" width="96" height="96" rx="20" fill={c(0.1)} stroke={c(0.55)} strokeWidth="1.5" />
          <rect x="-4" y="-18" width="96" height="96" rx="20" fill={c(0.16)} stroke={c(0.85)} strokeWidth="1.6" />
          <g fill={c(0.85)}>
            <rect x="12" y="-2" width="18" height="18" rx="5" />
            <rect x="52" y="-2" width="18" height="18" rx="5" />
            <rect x="12" y="38" width="18" height="18" rx="5" />
            <rect x="52" y="38" width="12" height="12" rx="3.5" />
          </g>
        </g>
      );
    case "dalga":
      return (
        <g>
          <g fill="none" stroke={c(0.4)} strokeWidth="1.6">
            <circle r="30" />
            <circle r="56" />
            <circle r="84" />
            <circle r="112" opacity="0.55" />
          </g>
          <circle r="11" fill={c(0.92)} />
        </g>
      );
    case "vizor":
      return (
        <g>
          <g fill="none" stroke={c(0.8)} strokeWidth="2.4" strokeLinecap="round">
            <path d="M-96-56v-24a16 16 0 0 1 16-16h24" />
            <path d="M96-56v-24a16 16 0 0 0-16-16H56" />
            <path d="M-96 56v24a16 16 0 0 0 16 16h24" />
            <path d="M96 56v24a16 16 0 0 1-16 16H56" />
          </g>
          <circle r="34" fill="none" stroke={c(0.55)} strokeWidth="1.6" />
          <circle r="13" fill={c(0.9)} />
        </g>
      );
    case "kopru":
      return (
        <g>
          <g fill={c(0.85)}>
            {Array.from({ length: 7 }, (_, i) => (
              <rect
                key={i}
                x={-104 + i * 13}
                y="-40"
                width={i % 3 === 0 ? 5 : 2.5}
                height="80"
                rx="1.5"
                opacity={i % 2 ? 0.55 : 1}
              />
            ))}
          </g>
          <path
            d="M-4 0h34m-12-11 12 11-12 11"
            fill="none"
            stroke={c(0.75)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g fill={c(0.9)} transform="translate(44 -34)">
            <rect x="0" y="0" width="20" height="20" rx="6" />
            <rect x="44" y="0" width="20" height="20" rx="6" />
            <rect x="0" y="44" width="20" height="20" rx="6" />
            <rect x="30" y="30" width="12" height="12" rx="3.5" />
            <rect x="50" y="50" width="14" height="14" rx="4" />
          </g>
        </g>
      );
    case "grafik":
      return (
        <g>
          <g stroke={c(0.22)} strokeWidth="1">
            <line x1="-110" y1="-40" x2="110" y2="-40" />
            <line x1="-110" y1="10" x2="110" y2="10" />
            <line x1="-110" y1="60" x2="110" y2="60" />
          </g>
          <path
            d="M-104 48-62 16-22 34 18-18 58-4 100-56"
            fill="none"
            stroke={c(0.85)}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="100" cy="-56" r="7" fill={c(0.95)} />
          <circle cx="100" cy="-56" r="15" fill="none" stroke={c(0.35)} strokeWidth="1.4" />
        </g>
      );
    case "para":
      return (
        <g>
          <circle cx="-28" cy="0" r="52" fill={c(0.1)} stroke={c(0.6)} strokeWidth="1.8" />
          <circle cx="28" cy="0" r="52" fill={c(0.1)} stroke={c(0.6)} strokeWidth="1.8" />
          <path
            d="M0-26v52M-13-16c0-7 6-11 13-11s13 4 13 11c0 15-26 9-26 24 0 8 6 12 13 12s13-4 13-12"
            fill="none"
            stroke={c(0.9)}
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      );
  }
}

export default function Artwork({
  tone,
  motif,
  width = 400,
  height = 250,
}: {
  tone: Tone;
  motif: Motif;
  width?: number;
  height?: number;
}) {
  // Gradyanlar belge genelinde benzersiz kimlik istiyor: aynı sayfada dokuz
  // görsel var ve hepsi kendi ışığını tanımlıyor.
  const id = useId().replace(/:/g, "");
  const p = TONES[tone];
  const c = (alpha: number) => `rgba(${p.mo},${alpha})`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0" stopColor={p.base} />
          <stop offset="1" stopColor={p.deep} />
        </linearGradient>
        <radialGradient id={`${id}g1`}>
          <stop offset="0" stopColor={p.l1} stopOpacity="0.78" />
          <stop offset="1" stopColor={p.l1} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}g2`}>
          <stop offset="0" stopColor={p.l2} stopOpacity="0.85" />
          <stop offset="1" stopColor={p.l2} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}grain`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect width={width} height={height} fill={`url(#${id}b)`} />
      <ellipse
        cx={width * 0.78}
        cy={height * 0.18}
        rx={width * 0.46}
        ry={height * 0.62}
        fill={`url(#${id}g1)`}
      />
      <ellipse
        cx={width * 0.12}
        cy={height * 0.92}
        rx={width * 0.5}
        ry={height * 0.7}
        fill={`url(#${id}g2)`}
      />
      <g transform={`translate(${width * 0.5} ${height * 0.5}) scale(${width / 400})`}>
        {motifOf(motif, c)}
      </g>
      <rect
        width={width}
        height={height}
        filter={`url(#${id}grain)`}
        opacity="0.16"
        style={{ mixBlendMode: "overlay" }}
      />
      <rect width={width} height={height} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
    </svg>
  );
}
