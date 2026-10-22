import type { Secim } from "./secenekler";

/**
 * Voyo Labs logosunun beş adayı. Hepsi aynı 48×48 çerçevede çiziliyor, böylece
 * menüde yer değiştirdiklerinde çubuğun yüksekliği oynamıyor.
 *
 * `koyu` koyu zemin için: kırmızılar bir ton açılıyor, bordo beyaza dönüyor.
 */
export function VoyoIsaret({
  tur,
  koyu = false,
  className,
}: {
  tur: Secim["logo"];
  koyu?: boolean;
  className?: string;
}) {
  const kirmizi = koyu ? "#ff4d42" : "#d11414";
  const acik = koyu ? "#ff8a82" : "#f05a4f";
  const murekkep = koyu ? "#f3eeed" : "#2a0d0b";

  if (tur === "L2") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={className}>
        <path d="M12 9L24 38L36 9" fill="none" stroke={kirmizi} strokeWidth={10} strokeLinejoin="round" />
        <circle cx={12.6} cy={10.6} r={2.1} fill="var(--color-paper)" />
        <circle cx={35.4} cy={10.6} r={2.1} fill="var(--color-paper)" />
      </svg>
    );
  }

  if (tur === "L3") {
    const kareler = [
      [4, 8], [36, 8], [8, 17], [32, 17], [14, 26], [26, 26],
    ];
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={className}>
        {kareler.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={8} height={8} rx={2} fill={murekkep} />
        ))}
        <rect x={20} y={35} width={8} height={8} rx={2} fill={kirmizi} />
      </svg>
    );
  }

  if (tur === "L4") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={className}>
        <circle cx={24} cy={24} r={13} fill="none" stroke={kirmizi} strokeWidth={9} />
      </svg>
    );
  }

  if (tur === "L5") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden className={className}>
        <rect width={48} height={48} rx={12} fill={kirmizi} />
        <path d="M11 13H20L24 26V37Z" fill="#ffffff" />
        <path d="M37 13H28L24 26V37Z" fill="#ffd2ce" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" aria-hidden className={className}>
      <path d="M5 8H17.5L24 25.5V42Z" fill={acik} />
      <path d="M43 8H30.5L24 25.5V42Z" fill={kirmizi} />
    </svg>
  );
}

/** İşaret ve ad yan yana. L4 bir sözcük logo: "voy" ve kırmızı halka "o". */
export default function VoyoLogo({ tur, koyu = false }: { tur: Secim["logo"]; koyu?: boolean }) {
  if (tur === "L4") {
    return (
      <span className="flex items-center gap-0.5">
        <span className="vitrin-baslik text-[26px] font-extrabold leading-none tracking-[-0.05em]">voy</span>
        <VoyoIsaret tur="L4" koyu={koyu} className="mt-1.5 h-[17px] w-[17px]" />
        <span className={`vitrin-baslik ml-1.5 text-xl font-medium ${koyu ? "text-on-deep/70" : "text-ink-muted"}`}>labs</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <VoyoIsaret tur={tur} koyu={koyu} className="h-8 w-8" />
      <span className="vitrin-baslik text-xl">
        <b className="font-extrabold">Voyo</b> <span className="font-medium">Labs</span>
      </span>
    </span>
  );
}
