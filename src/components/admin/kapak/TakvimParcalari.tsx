"use client";

import Link from "next/link";
import type { SVGProps } from "react";
import { gunEkle, utc, type Gun, type GunKiralama } from "@/components/admin/kapak/takvim";

/**
 * Takvim kartının ve büyütülmüş takvimin ortak parçaları: gün başlığı,
 * kiralama bağlantısı, bir günün listesi ve büyütme simgesi.
 */

const gunAdiUzun = new Intl.DateTimeFormat("tr-TR", { weekday: "long", timeZone: "UTC" });

export function gunBasligi(tarih: string, bugun: string) {
  if (tarih === bugun) return "Bugün";
  if (tarih === gunEkle(bugun, 1)) return "Yarın";
  if (tarih === gunEkle(bugun, -1)) return "Dün";
  const ad = gunAdiUzun.format(utc(tarih));
  return ad.charAt(0).toLocaleUpperCase("tr-TR") + ad.slice(1);
}

/** Rezervasyonun detay sayfasına giden satır. */
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
  return (
    <Link href={`/admin/bookings/${k.id}`} className={className} title={title}>
      {children}
    </Link>
  );
}

/**
 * Bir günün kiralamaları, satır satır: ürün, müşteri ve ne olduğu — çıkış
 * (ürün müşteriye gidiyor), dönüş (geri geliyor) ya da kirada.
 */
export function GunListesi({ gun, kiradaDahil = false }: { gun: Gun; kiradaDahil?: boolean }) {
  const satirlar = [
    ...gun.baslayan.map((k) => ({ k, tur: "baslar" as const })),
    ...gun.biten.map((k) => ({ k, tur: "biter" as const })),
    ...(kiradaDahil ? gun.kirada.map((k) => ({ k, tur: "kirada" as const })) : []),
  ];
  const etiket = { baslar: "Çıkış", biter: "Dönüş", kirada: "Kirada" };
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

/**
 * Büyütme simgesi: karşı köşelere açılan iki ok. Panelin simge setinde yok;
 * çizgi kalınlığı ve uçları oradakilerle aynı.
 */
export function IconBuyut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
