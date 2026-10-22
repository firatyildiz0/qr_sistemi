"use client";

import Link from "next/link";
import { gunEkle, utc, type Gun, type GunKiralama } from "@/components/admin/kapak/takvim";

/**
 * Takvim kartının ve büyütülmüş takvimin ortak parçaları: gün başlığı,
 * renk anahtarı, kiralama bağlantısı ve bir günün listesi.
 */

const gunAdiUzun = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" });

export function gunBasligi(tarih: string, bugun: string) {
  if (tarih === bugun) return "Bugün";
  if (tarih === gunEkle(bugun, 1)) return "Yarın";
  if (tarih === gunEkle(bugun, -1)) return "Dün";
  const ad = gunAdiUzun.format(utc(tarih));
  return ad.charAt(0).toLocaleUpperCase("tr-TR") + ad.slice(1);
}

export function Anahtar() {
  return (
    <p className="m-0 mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-accent" /> başlıyor
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-ink-muted" /> bitiyor
      </span>
    </p>
  );
}

/**
 * Kiralamaya giden bağlantı. Örnek verinin gideceği bir rezervasyon yok;
 * orada aynı görünümde düz bir kutu.
 */
export function KiralamaBaglantisi({
  k,
  className,
  title,
  children,
}: {
  k: GunKiralama;
  className: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (k.ornek) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link href={`/admin/bookings/${k.id}`} className={className} title={title}>
      {children}
    </Link>
  );
}

/** Bir günün kiralamaları, satır satır: ürün, müşteri, ne olduğu. */
export function GunListesi({ gun, kiradaDahil = false }: { gun: Gun; kiradaDahil?: boolean }) {
  const satirlar = [
    ...gun.baslayan.map((k) => ({ k, tur: "baslar" as const })),
    ...gun.biten.map((k) => ({ k, tur: "biter" as const })),
    ...(kiradaDahil ? gun.kirada.map((k) => ({ k, tur: "kirada" as const })) : []),
  ];
  const etiket = { baslar: "Başlıyor", biter: "Bitiyor", kirada: "Kirada" };
  const renk = { baslar: "text-accent", biter: "text-ink-muted", kirada: "text-success" };
  const nokta = { baslar: "bg-accent", biter: "bg-ink-muted", kirada: "bg-success" };
  return (
    <ul className="m-0 flex list-none flex-col p-0">
      {satirlar.map(({ k, tur }) => (
        <li key={`${tur}-${k.id}`}>
          <KiralamaBaglantisi
            k={k}
            className="-mx-2 flex items-center gap-3 rounded-[6px] px-2 py-2.5 transition-colors hover:bg-surface"
          >
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${nokta[tur]}`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{k.urunAdi}</span>
              <span className="block truncate text-[13px] text-ink-muted">{k.musteri}</span>
            </span>
            <span className={`shrink-0 text-xs font-semibold ${renk[tur]}`}>{etiket[tur]}</span>
          </KiralamaBaglantisi>
        </li>
      ))}
    </ul>
  );
}
