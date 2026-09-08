"use client";

import Link from "next/link";
import type { UrunKarti as Kart } from "@/lib/asistan/araclar";
import ProductThumb from "@/components/admin/ProductThumb";
import { IconArrowRight, IconTag } from "@/components/icons";

/**
 * Sohbetteki ürün künyesi.
 *
 * Kart bir süs değil, doğruluk önlemi. Ölçümde Haiku 4.5, eline verilen ürün
 * listesini doğru aldığı hâlde adları uydurabiliyor — "üç ürün var" deyip
 * katalogda olmayan iki ad sayabiliyor. Bu yüzden yanlış olması pahalı olan
 * her şey (ad, fiyat, teminat, stok, müsaitlik) modelin cümlesinden değil
 * doğrudan veritabanından geliyor ve burada basılıyor. Modele kalan tek şey
 * bağlayıcı cümle; oradaki bir kayma kartı yanlış yapmıyor.
 *
 * Aynı mantık onay kartında da var: model rezervasyonu anlatmıyor, kart
 * gösteriyor.
 */

/** Para birimini panelin geri kalanıyla aynı okur: 10.000 ₺. */
function para(deger: number): string {
  return `${deger.toLocaleString("tr-TR")} ₺`;
}

export default function UrunKarti({ kart }: { kart: Kart }) {
  // Üç durum, üç renk: elde var, tükendi, hepsi dışarıda. "0 adet müsait"
  // yazmak yerine sebebini söylemek satıcının bir sonraki hamlesini
  // değiştiriyor — stok yoksa ürün alınacak, doluysa tarih değişecek.
  const durum =
    kart.stok === 0
      ? { yazi: "Stokta yok", ton: "asistan-urun-rozet-yok" }
      : kart.bugun_musait === 0
        ? { yazi: "Bugün dolu", ton: "asistan-urun-rozet-dolu" }
        : {
            yazi: `Bugün ${kart.bugun_musait} adet müsait`,
            ton: "asistan-urun-rozet-bos",
          };

  return (
    <div className="asistan-giris asistan-urun">
      <div className="flex gap-3.5 p-3.5">
        {/* Panelin her yerindeki ürün görseliyle aynı bileşen: aynı yer
            tutucu, aynı "kırpma, sığdır" kararı. Kart kendi görsel kutusunu
            kurmuyor ki ürün listelerinden farklı görünmesin. */}
        <ProductThumb src={kart.gorsel} className="h-[4.5rem] w-[4.5rem]" sizes="72px" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold leading-tight tracking-tight text-ink">
            {kart.ad}
          </p>

          <p className={`asistan-urun-rozet mt-1.5 ${durum.ton}`}>{durum.yazi}</p>

          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {kart.gunluk_fiyat !== null && (
              <span className="text-[15px] font-extrabold tracking-tight text-ink">
                {para(kart.gunluk_fiyat)}
                <span className="text-xs font-semibold text-ink-muted"> / gün</span>
              </span>
            )}
            {kart.teminat !== null && (
              <span className="text-xs font-semibold text-ink-muted">
                {para(kart.teminat)} teminat
              </span>
            )}
            {kart.gunluk_fiyat === null && kart.teminat === null && (
              <span className="text-xs font-semibold text-ink-muted">
                Fiyat girilmemiş
              </span>
            )}
          </div>
        </div>
      </div>

      {(kart.aciklama || kart.ozellikler.length > 0) && (
        <div className="asistan-urun-alt px-3.5 py-3">
          {kart.aciklama && (
            <p className="asistan-urun-aciklama text-xs leading-relaxed text-ink-muted">
              {kart.aciklama}
            </p>
          )}
          {kart.ozellikler.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {kart.ozellikler.slice(0, 6).map((ozellik) => (
                <span key={ozellik} className="asistan-urun-etiket">
                  {ozellik}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="asistan-urun-alt flex items-center gap-3 px-3.5 py-2.5">
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
          {kart.etiket ? (
            <>
              <IconTag className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{kart.etiket}</span>
            </>
          ) : (
            <span className="truncate">Stok {kart.stok} adet</span>
          )}
        </span>

        {/* Kartın çıkış kapısı. Asistan hızlı cevap veriyor ama ürünün kendi
            sayfası düzenlemenin, takvimin ve QR'ın olduğu yer. */}
        <Link
          href={`/admin/products/${kart.id}`}
          className="asistan-urun-git flex shrink-0 items-center gap-1 text-[11px] font-bold"
        >
          Ürüne git
          <IconArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
