"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Voyo Labs'in hizmet rafı, yana kayan bir şerit.
 *
 * İlk kart yayındaki RentQR, ardından henüz adı konmamış hizmetler için boş
 * etiketler, en sonda da işletmeye "sıradakini siz söyleyin" diyen kart. Yeni
 * bir hizmet yayına girdiğinde boş etiketlerden biri onun kartına dönüşüyor.
 *
 * Kaydırma tarayıcının kendi yatay kaydırması: dokunmatikte parmakla,
 * dokunmatik yüzeyde iki parmakla, klavyede şerit odaktayken ok tuşlarıyla.
 * Fareyle tutup sürüklemek de çalışıyor — masaüstünde yatay kaydırma çubuğu
 * gizli olduğu için başka yolu yok. Oklar bir ekran boyu ilerletiyor; alttaki
 * ilerleme çizgisi şeridin ne kadarının görüldüğünü gösteriyor.
 */
export default function HizmetSeridi({
  ctaHref,
  ctaLabel,
  baslik,
  aciklama,
  yeni,
}: {
  ctaHref: string;
  ctaLabel: string;
  baslik: string;
  aciklama: string;
  /** Önerilen metinler mi, şimdikiler mi (bkz. vitrin/secenekler.ts). */
  yeni: boolean;
}) {
  const serit = useRef<HTMLUListElement>(null);
  const [durum, setDurum] = useState({ basta: true, sonda: false, oran: 0.5, ilerleme: 0 });
  const surukleme = useRef<{ x: number; sol: number; kaydi: boolean } | null>(null);

  useEffect(() => {
    const el = serit.current;
    if (!el) return;

    function olc() {
      if (!el) return;
      const bos = el.scrollWidth - el.clientWidth;
      setDurum({
        basta: el.scrollLeft <= 4,
        sonda: el.scrollLeft >= bos - 4,
        oran: Math.min(1, el.clientWidth / el.scrollWidth),
        ilerleme: bos > 0 ? el.scrollLeft / bos : 0,
      });
    }

    olc();
    el.addEventListener("scroll", olc, { passive: true });
    window.addEventListener("resize", olc);
    return () => {
      el.removeEventListener("scroll", olc);
      window.removeEventListener("resize", olc);
    };
  }, []);

  function ilerlet(yon: 1 | -1) {
    const el = serit.current;
    if (!el) return;
    el.scrollBy({ left: yon * el.clientWidth * 0.75 });
  }

  // Fareyle sürükleme. Dokunmatik ve kalem tarayıcının kendi kaydırmasında
  // kalıyor; yalnızca fare burada yakalanıyor.
  function basildi(e: React.PointerEvent<HTMLUListElement>) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    surukleme.current = { x: e.clientX, sol: e.currentTarget.scrollLeft, kaydi: false };
  }

  function surukleniyor(e: React.PointerEvent<HTMLUListElement>) {
    const s = surukleme.current;
    if (!s) return;
    const fark = e.clientX - s.x;
    if (!s.kaydi && Math.abs(fark) > 5) {
      s.kaydi = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.surukleniyor = "";
    }
    if (s.kaydi) e.currentTarget.scrollLeft = s.sol - fark;
  }

  function birakildi(e: React.PointerEvent<HTMLUListElement>) {
    const s = surukleme.current;
    surukleme.current = null;
    delete e.currentTarget.dataset.surukleniyor;
    // Sürükleme bir bağlantının üstünde bittiyse o bağlantı açılmasın.
    if (s?.kaydi) {
      e.currentTarget.addEventListener("click", (t) => t.preventDefault(), { capture: true, once: true });
    }
  }

  const okSinifi =
    "flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-card text-ink transition-[opacity,transform,background-color] hover:bg-accent-soft active:scale-95 disabled:cursor-default disabled:opacity-35 disabled:hover:bg-card";

  return (
    <div className="flex flex-col gap-8">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-end justify-between gap-6 px-6">
        <div className="flex max-w-2xl flex-col gap-4">
          <h2 className="vitrin-baslik m-0 text-[34px] font-extrabold leading-[1.02] text-ink sm:text-[52px]">
            {baslik}
          </h2>
          <p className="m-0 max-w-lg text-[17px] leading-relaxed text-ink-muted">
            {aciklama}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className={okSinifi} onClick={() => ilerlet(-1)} disabled={durum.basta} aria-label="Önceki hizmetler">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button type="button" className={okSinifi} onClick={() => ilerlet(1)} disabled={durum.sonda} aria-label="Sonraki hizmetler">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Şerit sayfanın sağ kenarına kadar taşıyor ama ilk kart başlıkla aynı
          hizadan başlıyor: iç boşluk kabın kenar boşluğuna eşit. */}
      <ul
        ref={serit}
        tabIndex={0}
        aria-label="Hizmetler"
        onPointerDown={basildi}
        onPointerMove={surukleniyor}
        onPointerUp={birakildi}
        onPointerCancel={birakildi}
        className="hizmet-seridi m-0 flex list-none snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain px-[max(1.5rem,calc((100%-1200px)/2+1.5rem))] pb-4 pt-2 [scroll-padding-inline:max(1.5rem,calc((100%-1200px)/2+1.5rem))] [scrollbar-width:none] focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {/* RentQR */}
        <li className="flex w-[min(86vw,620px)] shrink-0 snap-start">
          <article className="flex w-full flex-col gap-6 rounded-[32px] bg-card p-7 shadow-[var(--app-lift)] sm:p-9">
            <div className="flex items-center justify-between gap-4">
              <h3 className="vitrin-baslik m-0 text-[34px] font-extrabold text-brand">RentQR</h3>
              <span className="rounded-full bg-[color-mix(in_oklab,var(--color-success)_14%,var(--color-card))] px-3 py-1.5 text-[13px] font-bold text-success">
                Yayında
              </span>
            </div>
            <p className="m-0 text-[17px] leading-relaxed text-ink">
              QR etiketle kiralama. Müşteriniz ürünün üstündeki etiketi okutur, boş günü seçer;
              rezervasyon panelinize düşer.
            </p>
            <ul className="m-0 grid list-none gap-3 p-0 text-[15px] text-ink-muted sm:grid-cols-2">
              {[
                "Müsaitlik takvimi, çakışma engeli",
                "İade günü hatırlatması",
                "Görselle ve barkodla ürün bulma",
                "Son 30 günün raporu",
              ].map((madde) => (
                <li key={madde} className="flex gap-2.5">
                  <svg aria-hidden viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-accent" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                  {madde}
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap gap-3 pt-2">
              <Link href={ctaHref} className="btn btn-primary h-12">
                {ctaLabel}
              </Link>
              <a href="#nasil" className="btn btn-secondary h-12">
                Nasıl çalışır
              </a>
            </div>
          </article>
        </li>

        {/* Henüz adı konmamış hizmetler: boş etiket. */}
        {(yeni
          ? [
              { baslik: "Yeni hizmet", metin: "Üzerinde çalışıyoruz. Hazır olduğunda burada duyuracağız." },
              { baslik: "Bir sonraki", metin: "Üzerinde çalışıyoruz. Hazır olduğunda burada duyuracağız." },
            ]
          : [
              { baslik: "Sıradaki hizmet", metin: "Üzerinde çalışıyoruz. Hazır olduğunda RentQR hesabınızla açılacak." },
              { baslik: "Bir sonraki", metin: "Etiketi henüz basılmadı. Sırası geldiğinde ilk burada duyuracağız." },
            ]
        ).map((bos) => (
          <li key={bos.baslik} className="flex w-[min(78vw,340px)] shrink-0 snap-start">
            <article className="flex w-full overflow-hidden rounded-[32px] border-2 border-dashed border-border-strong">
              <div aria-hidden className="w-12 flex-none border-r-2 border-dashed border-border-strong bg-[radial-gradient(circle_at_0_50%,var(--color-paper)_6px,transparent_6.5px)] bg-[length:12px_20px] bg-repeat-y" />
              <div className="flex flex-1 flex-col gap-3 p-7">
                <span className="w-fit rounded-full border border-border-strong px-3 py-1.5 text-[13px] font-bold text-ink-muted">
                  Yolda
                </span>
                <h3 className="vitrin-baslik m-0 mt-auto text-[26px] font-extrabold text-ink-muted">{bos.baslik}</h3>
                <p className="m-0 text-[15px] leading-relaxed text-ink-muted">{bos.metin}</p>
              </div>
            </article>
          </li>
        ))}

        {/* İşletmeden gelen fikir */}
        <li className="flex w-[min(78vw,360px)] shrink-0 snap-start">
          <article className="flex w-full flex-col gap-4 rounded-[32px] border border-border-dark bg-deep p-7 text-on-deep">
            <h3 className="vitrin-baslik m-0 text-[26px] font-extrabold leading-tight">
              İşinizde hâlâ defterle yürüyen bir şey mi var?
            </h3>
            <p className="m-0 text-[15px] leading-relaxed text-on-deep/75">
              {yeni
                ? "İşinizde hâlâ defterle ya da telefonla yürüyen bir iş varsa anlatın."
                : "Sıradaki hizmetleri işletmelerin anlattıklarına bakarak seçiyoruz. Nerede vakit kaybettiğinizi bize yazın."}
            </p>
            <Link
              href="/hakkimizda#iletisim"
              className="mt-auto w-fit rounded-full bg-on-deep px-5 py-3 text-sm font-bold text-deep transition-transform hover:-translate-y-0.5"
            >
              Bize yazın
            </Link>
          </article>
        </li>
      </ul>

      {/* İlerleme: çizginin genişliği görünen kısmın oranı, konumu ne kadar
          kaydırıldığı. Yalnızca gösterge — tıklanmıyor. */}
      <div className="mx-auto w-full max-w-[1200px] px-6" aria-hidden>
        <div className="h-1 w-full max-w-xs overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-ink transition-transform duration-150"
            style={{
              width: `${durum.oran * 100}%`,
              transform: `translateX(${durum.ilerleme * (1 / durum.oran - 1) * 100}%)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
