"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Kart = {
  ad: string;
  tur: "canli" | "yolda" | "fikir";
  rozet: string;
  metin: string;
  bag?: { href: string; ad: string };
};

/**
 * Voyo Labs'in hizmetleri, labs.google'daki deney rafı gibi bir yay üzerinde
 * yelpaze. Ortadaki kart dik ve önde; yanındakiler eğilip geriye çekiliyor.
 *
 * Dönme yolları: oklar, alttaki noktalar, yandaki bir karta basmak, kartları
 * parmakla ya da fareyle yana çekmek. Hareket kapalıysa kartlar yine yer
 * değiştiriyor ama kaymadan, anında.
 */
export default function HizmetYelpazesi({
  ctaHref,
  baslik,
  aciklama,
}: {
  ctaHref: string;
  baslik: string;
  aciklama: string;
}) {
  const kartlar: Kart[] = [
    {
      ad: "Yeni hizmet",
      tur: "yolda",
      rozet: "Yolda",
      metin: "Üzerinde çalışıyoruz. Hazır olduğunda burada duyuracağız.",
    },
    {
      ad: "RentQR",
      tur: "canli",
      rozet: "Yayında",
      metin: "QR etiketle kiralama. Müşteri ürünü okutur, boş günü seçer ve rezervasyon talebi bırakır.",
      bag: { href: ctaHref, ad: "RentQR’ı dene" },
    },
    {
      ad: "Yeni hizmet",
      tur: "yolda",
      rozet: "Yolda",
      metin: "Üzerinde çalışıyoruz. Hazır olduğunda burada duyuracağız.",
    },
    {
      ad: "Fikriniz mi var?",
      tur: "fikir",
      rozet: "Öneri",
      metin: "İşinizde hâlâ defterle ya da telefonla yürüyen bir iş varsa anlatın.",
      bag: { href: "/hakkimizda#iletisim", ad: "Bize yazın" },
    },
  ];

  const [etkin, setEtkin] = useState(1);
  const [adim, setAdim] = useState(270);
  const cekme = useRef<{ x: number; id: number } | null>(null);

  // Kartlar arası yatay mesafe ekran genişliğine göre: telefonda yanlardaki
  // kartlar ekranın kenarından taşarak "yana kayıyor" hissini veriyor.
  useEffect(() => {
    const olc = () => setAdim(Math.min(270, window.innerWidth * 0.62));
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, []);

  const git = (sira: number) => setEtkin(Math.max(0, Math.min(kartlar.length - 1, sira)));

  function basildi(e: React.PointerEvent) {
    cekme.current = { x: e.clientX, id: e.pointerId };
  }
  function birakildi(e: React.PointerEvent) {
    const c = cekme.current;
    cekme.current = null;
    if (!c || c.id !== e.pointerId) return;
    const fark = e.clientX - c.x;
    if (Math.abs(fark) > 40) git(etkin + (fark < 0 ? 1 : -1));
  }

  const ok =
    "flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-border-strong bg-card text-ink transition-[transform,opacity] hover:-translate-y-0.5 disabled:opacity-35 disabled:hover:translate-y-0";

  return (
    <div className="relative overflow-hidden py-24">
      {/* Zemindeki büyük biçimler: labs.google'ın renkli lekeleri, marka tonlarında. */}
      <span aria-hidden className="absolute left-[8%] top-[42%] h-[460px] w-[460px] rounded-full bg-accent-soft" />
      <span aria-hidden className="absolute -right-24 -top-28 h-[340px] w-[420px] -rotate-12 rounded-b-[200px] bg-deep" />
      <span aria-hidden className="absolute -bottom-40 right-[12%] h-[320px] w-[320px] rotate-[18deg] rounded-[80px] bg-[#ff8a82]/70" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center">
        <h2 className="vitrin-baslik m-0 text-[40px] font-extrabold leading-none text-ink sm:text-[64px]">{baslik}</h2>
        <p className="m-0 text-lg text-ink-muted">{aciklama}</p>
      </div>

      <div
        className="relative mt-12 h-[520px] touch-pan-y select-none"
        onPointerDown={basildi}
        onPointerUp={birakildi}
        onPointerCancel={() => (cekme.current = null)}
      >
        {kartlar.map((kart, i) => {
          const d = i - etkin;
          const a = Math.abs(d);
          const secili = d === 0;
          return (
            <article
              key={i}
              aria-hidden={a > 2}
              className="absolute left-1/2 top-4 -ml-[150px] flex w-[300px] origin-[50%_120%] flex-col gap-3.5 rounded-[28px] bg-card p-3 pb-6 shadow-[0_30px_50px_-30px_var(--app-shadow)] transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.34,1.2,0.64,1)] motion-reduce:transition-none"
              style={{
                transform: `translateX(${d * adim}px) translateY(${a * a * 26 + a * 14}px) rotate(${d * 7}deg) scale(${1 - a * 0.05})`,
                zIndex: 10 - a,
                opacity: a > 2 ? 0 : 1,
              }}
            >
              <KartGorseli tur={kart.tur} />
              <div className="flex flex-col gap-2 px-2">
                <span className="flex items-center justify-between gap-2">
                  <h3 className={`vitrin-baslik m-0 text-2xl font-extrabold ${kart.tur === "canli" ? "text-brand" : "text-ink"}`}>
                    {kart.ad}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                      kart.tur === "canli"
                        ? "bg-[color-mix(in_oklab,var(--color-success)_14%,var(--color-card))] text-success"
                        : "bg-paper text-ink-muted"
                    }`}
                  >
                    {kart.rozet}
                  </span>
                </span>
                <p className="m-0 text-sm leading-relaxed text-ink-muted">{kart.metin}</p>
                {kart.bag && (
                  <Link
                    href={kart.bag.href}
                    tabIndex={secili ? undefined : -1}
                    className="mt-1 w-fit text-sm font-extrabold text-ink underline underline-offset-4 hover:text-accent"
                  >
                    {kart.bag.ad}
                  </Link>
                )}
              </div>
              {/* Yandaki karta basınca öne gelsin. */}
              {!secili && a <= 2 && (
                <button
                  type="button"
                  aria-label={`${kart.ad} kartını öne getir`}
                  onClick={() => git(i)}
                  className="absolute inset-0 rounded-[28px] focus-visible:outline-2 focus-visible:outline-accent"
                />
              )}
            </article>
          );
        })}
      </div>

      <div className="relative flex items-center justify-center gap-4">
        <button type="button" aria-label="Önceki hizmet" disabled={etkin === 0} onClick={() => git(etkin - 1)} className={ok}>
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <div className="flex gap-2">
          {kartlar.map((kart, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}. kart: ${kart.ad}`}
              aria-current={i === etkin ? "true" : undefined}
              onClick={() => git(i)}
              className={`h-2 rounded-full transition-all duration-300 ${i === etkin ? "w-8 bg-ink" : "w-2 bg-border-strong"}`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Sonraki hizmet"
          disabled={etkin === kartlar.length - 1}
          onClick={() => git(etkin + 1)}
          className={ok}
        >
          <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function KartGorseli({ tur }: { tur: Kart["tur"] }) {
  if (tur === "canli") {
    return (
      <div className="flex h-[230px] items-center justify-center rounded-[20px] bg-[#d11414]">
        <div className="flex w-[130px] -rotate-6 flex-col gap-2 rounded-[14px] bg-white p-3 shadow-[0_16px_30px_-16px_rgba(0,0,0,0.5)]">
          <svg aria-hidden viewBox="0 0 7 7" className="aspect-square w-full" shapeRendering="crispEdges">
            <path
              fill="#1f1413"
              fillRule="evenodd"
              d="M0 0h3v3h-3zM1 1v1h1v-1zM4 0h3v3h-3zM5 1v1h1v-1zM0 4h3v3h-3zM1 5v1h1v-1zM4 4h1v1h-1zM6 4h1v1h-1zM5 5h1v1h-1zM4 6h1v1h-1zM6 6h1v1h-1z"
            />
          </svg>
          <span className="h-1.5 w-[70%] rounded-full bg-[#e9e1df]" />
        </div>
      </div>
    );
  }
  if (tur === "fikir") {
    return (
      <div className="flex h-[230px] items-center justify-center rounded-[20px] bg-deep">
        <svg aria-hidden viewBox="0 0 24 24" className="h-[88px] w-[88px]" fill="none" stroke="#ff8a82" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16v11H9l-5 4z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-[230px] items-center justify-center rounded-[20px] border-2 border-dashed border-border-strong bg-paper text-sm font-bold text-ink-muted">
      Üzerinde çalışıyoruz
    </div>
  );
}
