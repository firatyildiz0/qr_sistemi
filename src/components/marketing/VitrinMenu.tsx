"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import VoyoLogo from "./VoyoLogo";
import TemaDugmesi from "./TemaDugmesi";

const BOLUM_LINKLERI = [
  { href: "#nasil", ad: "Nasıl çalışır" },
  { href: "#panel", ad: "Panel" },
  { href: "#fiyat", ad: "Fiyat" },
  { href: "#hizmetler", ad: "Hizmetler" },
];

/**
 * Anasayfanın menüsü. Sayfanın başında zemine karışıyor, kaydırınca buzlu bir
 * zemin ve alt çizgi alıyor ki altından geçen içerikle karışmasın.
 *
 * Telefonda bağlantılar ve birincil düğme gizli: orada sayfanın altındaki
 * eylem çubuğu aynı düğmeyi taşıyor, bölümler de zaten alt alta. Tema düğmesi
 * her ekranda duruyor.
 *
 * Anasayfa dışındaki sayfalarda (yasal metinler) `bolumler={false}`: oradan
 * anasayfanın bölümlerine atlamanın anlamı yok, logo anasayfaya dönüyor.
 */
export default function VitrinMenu({
  girisGoster,
  ctaHref,
  ctaLabel,
  bolumler = true,
}: {
  girisGoster: boolean;
  ctaHref: string;
  ctaLabel: string;
  bolumler?: boolean;
}) {
  const [kaydi, setKaydi] = useState(false);

  useEffect(() => {
    const olc = () => setKaydi(window.scrollY > 8);
    olc();
    window.addEventListener("scroll", olc, { passive: true });
    return () => window.removeEventListener("scroll", olc);
  }, []);

  return (
    <nav
      aria-label="Ana menü"
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        kaydi
          ? "bg-[color-mix(in_oklab,var(--color-paper)_82%,transparent)] shadow-[0_1px_0_var(--color-border)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
        {bolumler ? (
          <a href="#giris" className="text-ink">
            <VoyoLogo />
          </a>
        ) : (
          <Link href="/" className="text-ink">
            <VoyoLogo />
          </Link>
        )}
        {bolumler && (
          <div className="hidden items-center gap-9 text-[15px] font-semibold text-ink md:flex">
            {BOLUM_LINKLERI.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-accent">
                {l.ad}
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-5 text-[15px] font-bold">
          {/* Telefonda menüde görünen tek şey: diğerleri altta. */}
          <TemaDugmesi className="-mr-2 md:mr-0" />
          {girisGoster && (
            <Link href="/login" className="hidden text-ink transition-colors hover:text-accent md:block">
              Giriş yap
            </Link>
          )}
          <Link
            href={ctaHref}
            className="hidden rounded-full bg-ink px-5 py-3 text-paper transition-transform hover:-translate-y-0.5 sm:inline-flex"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}
