import Link from "next/link";

export type GunKiralama = {
  id: string;
  urunAdi: string;
  musteri: string;
};

export type Gun = {
  /** YYYY-MM-DD */
  tarih: string;
  baslayan: GunKiralama[];
  biten: GunKiralama[];
};

const gunAdi = new Intl.DateTimeFormat("tr-TR", { weekday: "short", timeZone: "UTC" });
const gunNo = new Intl.DateTimeFormat("tr-TR", { day: "numeric", timeZone: "UTC" });
const ayAdi = new Intl.DateTimeFormat("tr-TR", { month: "short", timeZone: "UTC" });

/** `YYYY-MM-DD`'yi saat dilimine takılmadan biçimlemek için gece yarısı UTC. */
function utc(tarih: string) {
  return new Date(`${tarih}T00:00:00Z`);
}

/**
 * "Önümüzdeki 7 gün" kartı: bugün koyu, sonraki altı gün açık sütunlar. Her
 * günde o gün başlayan ve biten kiralamalar.
 *
 * Saat yok: rezervasyonlar gün olarak tutuluyor. Kart da günü anlatıyor.
 */
export default function BugunKarti({ gunler }: { gunler: Gun[] }) {
  return (
    <section aria-label="Önümüzdeki 7 gün" className="kapak-kart rounded-[28px] bg-card p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="kapak-baslik m-0 text-[28px] font-extrabold leading-none text-ink sm:text-[34px]">
          Önümüzdeki 7 gün
        </h2>
        <p className="m-0 flex items-center gap-4 text-xs font-semibold text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" /> başlıyor
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-ink-muted" /> bitiyor
          </span>
        </p>
      </div>
      {/* Telefonda yedi sütun sığmıyor: şerit kartın içinde yana kayıyor,
          sayfa kaymıyor. */}
      <ol className="-mx-1 m-0 flex list-none snap-x gap-2 overflow-x-auto p-1 pb-2">
        {gunler.map((gun, i) => {
          const bugun = i === 0;
          const tarih = utc(gun.tarih);
          const bos = gun.baslayan.length === 0 && gun.biten.length === 0;
          return (
            <li
              key={gun.tarih}
              className={`kapak-satir flex min-h-[184px] min-w-[132px] flex-1 snap-start flex-col gap-3 rounded-[20px] p-3.5 ${
                bugun ? "bg-deep text-on-deep" : "bg-surface text-ink"
              }`}
              style={{ "--i": i } as React.CSSProperties}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${bugun ? "text-on-deep/70" : "text-ink-muted"}`}>
                  {bugun ? "Bugün" : gunAdi.format(tarih)}
                </span>
                <span className="kapak-baslik text-[26px] font-extrabold leading-none">
                  {gunNo.format(tarih)}
                  <span className={`ml-1 text-xs font-bold ${bugun ? "text-on-deep/60" : "text-ink-muted"}`}>
                    {ayAdi.format(tarih)}
                  </span>
                </span>
              </div>
              {bos ? (
                <span className={`mt-auto text-xs ${bugun ? "text-on-deep/55" : "text-ink-muted/80"}`}>Boş</span>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {gun.baslayan.slice(0, 3).map((k) => (
                    <SeritOge key={`b-${k.id}`} k={k} tur="baslar" koyu={bugun} />
                  ))}
                  {gun.biten.slice(0, 3).map((k) => (
                    <SeritOge key={`e-${k.id}`} k={k} tur="biter" koyu={bugun} />
                  ))}
                  {gun.baslayan.length + gun.biten.length > 6 && (
                    <li className={`text-xs font-semibold ${bugun ? "text-on-deep/60" : "text-ink-muted"}`}>
                      +{gun.baslayan.length + gun.biten.length - 6} daha
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function SeritOge({ k, tur, koyu }: { k: GunKiralama; tur: "baslar" | "biter"; koyu: boolean }) {
  return (
    <li>
      <Link
        href={`/admin/bookings/${k.id}`}
        title={`${k.urunAdi} · ${k.musteri} · ${tur === "baslar" ? "başlıyor" : "bitiyor"}`}
        className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-[12px] font-semibold transition-colors ${
          koyu ? "hover:bg-on-deep/10" : "hover:bg-card"
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rounded-full ${tur === "baslar" ? "bg-accent" : koyu ? "bg-on-deep/50" : "bg-ink-muted"}`}
        />
        <span className="sr-only">{tur === "baslar" ? "Başlıyor:" : "Bitiyor:"}</span>
        <span className="truncate">{k.urunAdi}</span>
      </Link>
    </li>
  );
}
