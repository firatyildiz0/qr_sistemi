/**
 * Oyunun balonu.
 *
 * Hacim tek bir eğimli degradeden değil, üç katmandan geliyor: merkezi sol üste
 * kaymış bir radyal degrade (ışık oradan geliyor), sağ alt kenara oturan koyu
 * bir hilal (gölge) ve tam tepede küçük bir parlama (lastiğin ışığı yakaladığı
 * nokta). Alttaki düğüm ve ipin hafif kıvrımı ise ölçeği veriyor — düz bir çizgi
 * balonu bir daireye indirger.
 *
 * Renkler bilerek temanın değişkenlerinden bağımsız: bir balon koyu temada da
 * kırmızıdır, vurgu rengi ne olursa olsun.
 */

export type BalonRengi = {
  anahtar: string;
  parlak: string;
  taban: string;
  koyu: string;
  ip: string;
};

export const BALON_RENKLERI: BalonRengi[] = [
  { anahtar: "kirmizi", parlak: "#ff9c93", taban: "#f4554b", koyu: "#b8241d", ip: "#8f1f1a" },
  { anahtar: "turuncu", parlak: "#ffc98a", taban: "#ff9a3d", koyu: "#c96a0c", ip: "#96500a" },
  { anahtar: "sari", parlak: "#ffeaa0", taban: "#ffd147", koyu: "#d09a0d", ip: "#96700a" },
  { anahtar: "yesil", parlak: "#9fe9c4", taban: "#42cd8b", koyu: "#159160", ip: "#0f6845" },
  { anahtar: "mavi", parlak: "#a8d6ff", taban: "#4ea4ff", koyu: "#1c68c8", ip: "#164b8f" },
  { anahtar: "mor", parlak: "#d6bcff", taban: "#a077f5", koyu: "#6a3bc4", ip: "#4c2a8c" },
  { anahtar: "pembe", parlak: "#ffbde0", taban: "#ff77c0", koyu: "#d0398f", ip: "#96276a" },
];

/* Gövde armut biçiminde: tepesi geniş bir küre, aşağı doğru daralıp düğüme
   iniyor. Bir elips balon değil, top gibi durur. */
const GOVDE =
  "M36 5c14.9 0 26.5 12.2 26.5 27.4 0 13.8-9.4 24.4-18.6 30.6-2.9 2-4.4 4.6-7.9 4.6s-5-2.6-7.9-4.6C18.9 56.8 9.5 46.2 9.5 32.4 9.5 17.2 21.1 5 36 5Z";

export default function Balon({ renk }: { renk: BalonRengi }) {
  const kimlik = `balon-${renk.anahtar}`;
  return (
    <svg viewBox="0 0 72 100" className="oyun-balon-svg" aria-hidden>
      <defs>
        <radialGradient id={kimlik} cx="0.34" cy="0.26" r="0.82">
          <stop offset="0" stopColor={renk.parlak} />
          <stop offset="0.45" stopColor={renk.taban} />
          <stop offset="1" stopColor={renk.koyu} />
        </radialGradient>
      </defs>

      {/* İp: hafif "S" kıvrımı, uçtan uca inceliyor. */}
      <path
        d="M36 71c4.5 5 1 10.5-2.5 14.5S31 95 34.5 98"
        fill="none"
        stroke={renk.ip}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path d={GOVDE} fill={`url(#${kimlik})`} />
      {/* Sağ alt kenarın koyu hilali: gövdenin kendi gölgesi. */}
      <path
        d="M56.6 18.6c3.7 4.9 5.9 11.2 5.9 18.4 0 13.8-9.4 24.4-18.6 30.6-2.9 2-4.4 4.6-7.9 4.6-1.3 0-2.3-.4-3.2-1 2.2-.6 3.5-2.5 5.6-3.9 9.2-6.2 18.6-16.8 18.6-30.6 0-7-2.1-13.2-5.7-18.1z"
        fill={renk.koyu}
        opacity="0.55"
      />
      {/* Alt kenardaki ince ışık: arkadan gelen dolgu ışığı, balonu zeminden koparıyor. */}
      <path
        d="M23 61c3.4 3.6 7.6 6.2 11 8.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.22"
      />
      <ellipse cx="24.5" cy="23" rx="7.2" ry="10.4" transform="rotate(-24 24.5 23)" fill="#ffffff" opacity="0.42" />
      <circle cx="32" cy="14" r="2.6" fill="#ffffff" opacity="0.55" />
      {/* Düğüm: gövdeden koyu, küçük bir üçgen. */}
      <path d="M32.4 66.6h7.2L36 72.4z" fill={renk.koyu} />
    </svg>
  );
}
