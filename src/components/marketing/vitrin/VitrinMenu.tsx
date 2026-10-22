"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VoyoLogo from "./VoyoLogo";
import type { Secim } from "./secenekler";

type Props = {
  tur: Secim["menu"];
  logo: Secim["logo"];
  girisGoster: boolean;
  ctaHref: string;
  ctaLabel: string;
};

const BOLUM_LINKLERI = [
  { href: "#nasil", ad: "Nasıl çalışır" },
  { href: "#panel", ad: "Panel" },
  { href: "#fiyat", ad: "Fiyat" },
  { href: "#hizmetler", ad: "Hizmetler" },
];

/**
 * Anasayfanın dört menü adayı. Hepsi aynı bağlantıları taşıyor; değişen yalnızca
 * yerleşim ve davranış — karşılaştırma bu yüzden adil.
 */
export default function VitrinMenu(props: Props) {
  if (props.tur === "N2") return <HizmetMenulu {...props} />;
  if (props.tur === "N3") return <CiftKatli {...props} />;
  if (props.tur === "N4") return <YuzenAltCubuk {...props} />;
  return <Sade {...props} />;
}

/** N1: sayfanın başında zemine karışıyor, kaydırınca buzlu beyaz zemin alıyor. */
function Sade({ logo, girisGoster, ctaHref, ctaLabel }: Props) {
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
        <a href="#giris" className="text-ink">
          <VoyoLogo tur={logo} />
        </a>
        <div className="hidden items-center gap-9 text-[15px] font-semibold text-ink md:flex">
          {BOLUM_LINKLERI.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-accent">
              {l.ad}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-5 text-[15px] font-bold">
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

/** N2: "Hizmetler" Voyo'nun bütün hizmetlerini gösteren bir panel açıyor. */
function HizmetMenulu({ logo, girisGoster, ctaHref, ctaLabel }: Props) {
  const [acik, setAcik] = useState(false);
  const kutu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    function disari(e: PointerEvent) {
      if (kutu.current && !kutu.current.contains(e.target as Node)) setAcik(false);
    }
    function tus(e: KeyboardEvent) {
      if (e.key === "Escape") setAcik(false);
    }
    document.addEventListener("pointerdown", disari);
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("pointerdown", disari);
      document.removeEventListener("keydown", tus);
    };
  }, [acik]);

  const link = "rounded-xl px-3.5 py-2.5 text-[15px] font-semibold text-ink transition-colors hover:bg-accent-soft";

  return (
    <nav aria-label="Ana menü" className="fixed inset-x-3 top-3 z-50 mx-auto max-w-[1200px]">
      <div
        ref={kutu}
        className="relative flex h-16 items-center justify-between rounded-[20px] border border-border bg-card px-3 pl-5 shadow-[var(--app-lift)]"
      >
        <div className="flex items-center gap-6">
          <a href="#giris" className="text-ink">
            <VoyoLogo tur={logo} />
          </a>
          <div className="hidden items-center gap-1 md:flex">
            <button
              type="button"
              aria-expanded={acik}
              aria-controls="hizmet-paneli"
              onClick={() => setAcik((a) => !a)}
              className={`${link} flex items-center gap-1.5 ${acik ? "bg-accent-soft text-accent-hover" : ""}`}
            >
              Hizmetler
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className={`h-3.5 w-3.5 transition-transform ${acik ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
                strokeLinecap="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            <a href="#nasil" className={link}>
              Nasıl çalışır
            </a>
            <a href="#fiyat" className={link}>
              Fiyat
            </a>
            <Link href="/hakkimizda" className={link}>
              Hakkımızda
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {girisGoster && (
            <Link href="/login" className={`${link} hidden md:block`}>
              Giriş yap
            </Link>
          )}
          <Link href={ctaHref} className="btn btn-primary hidden h-11 min-h-0 rounded-[14px] sm:inline-flex">
            {ctaLabel}
          </Link>
        </div>

        {acik && (
          <div
            id="hizmet-paneli"
            className="absolute left-36 top-[calc(100%+8px)] grid w-[min(640px,calc(100vw-24px))] grid-cols-2 gap-2 rounded-[20px] border border-border bg-card p-4 shadow-[0_24px_50px_-24px_var(--app-shadow)]"
          >
            <a
              href="#nasil"
              onClick={() => setAcik(false)}
              className="row-span-2 flex flex-col gap-2.5 rounded-[14px] bg-accent-soft/60 p-5 transition-colors hover:bg-accent-soft"
            >
              <span className="flex items-center justify-between">
                <span className="vitrin-baslik text-[22px] font-extrabold text-brand">RentQR</span>
                <span className="rounded-full bg-[color-mix(in_oklab,var(--color-success)_14%,var(--color-card))] px-2.5 py-1 text-xs font-bold text-success">
                  Yayında
                </span>
              </span>
              <span className="text-sm leading-relaxed text-ink-muted">
                Kiraya verdiğiniz ürünlere QR etiket. Müşteri okutur, boş günü seçer, rezervasyon yapar.
              </span>
              <span className="mt-auto text-sm font-bold text-ink">RentQR&apos;ı incele</span>
            </a>
            <div className="flex flex-col gap-1 rounded-[14px] border-[1.5px] border-dashed border-border-strong p-4 text-ink-muted">
              <span className="text-[15px] font-extrabold">Yeni hizmet</span>
              <span className="text-[13px]">Üzerinde çalışıyoruz</span>
            </div>
            <Link
              href="/hakkimizda#iletisim"
              className="flex flex-col gap-1 rounded-[14px] bg-deep p-4 text-on-deep transition-transform hover:-translate-y-0.5"
            >
              <span className="text-[15px] font-extrabold">Fikriniz mi var?</span>
              <span className="text-[13px] text-on-deep/75">Bize yazın</span>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

/** N3: üstte Voyo Labs ve hizmet geçişi, altında RentQR sayfasının kendi menüsü. */
function CiftKatli({ logo, girisGoster, ctaHref, ctaLabel }: Props) {
  return (
    <nav aria-label="Ana menü" className="fixed inset-x-0 top-0 z-50">
      <div className="bg-deep text-on-deep">
        <div className="mx-auto flex h-10 max-w-[1200px] items-center justify-between px-6 text-[13px] font-semibold">
          <div className="flex items-center gap-3">
            <span className="[&_.vitrin-baslik]:text-[15px] [&_svg]:h-5 [&_svg]:w-5">
              <VoyoLogo tur={logo} koyu />
            </span>
            <span className="text-on-deep/40">/</span>
            <a href="#giris" className="rounded-full bg-white/10 px-2.5 py-1">
              RentQR
            </a>
            <span className="hidden text-on-deep/60 sm:inline">Yeni hizmetler yolda</span>
          </div>
          {girisGoster && (
            <Link href="/login" className="hover:underline">
              Giriş yap
            </Link>
          )}
        </div>
      </div>
      <div className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <a href="#giris" className="vitrin-baslik text-[22px] font-extrabold text-brand">
            RentQR
          </a>
          <div className="hidden items-center gap-8 text-[15px] font-semibold text-ink md:flex">
            {BOLUM_LINKLERI.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors hover:text-accent">
                {l.ad}
              </a>
            ))}
          </div>
          <Link href={ctaHref} className="btn btn-primary hidden h-11 min-h-0 sm:inline-flex">
            {ctaLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}

/** N4: üstte yalnız logo; menü ekranın altında yüzen koyu bir çubuk. */
function YuzenAltCubuk({ logo, girisGoster, ctaHref, ctaLabel }: Props) {
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <a href="#giris" className="text-ink">
            <VoyoLogo tur={logo} />
          </a>
          {girisGoster && (
            <Link href="/login" className="text-[15px] font-bold text-ink hover:text-accent">
              Giriş yap
            </Link>
          )}
        </div>
      </div>
      <nav
        aria-label="Ana menü"
        className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-full bg-deep p-2 text-sm font-bold shadow-[0_24px_40px_-20px_var(--app-shadow)] [scrollbar-width:none]"
      >
        {BOLUM_LINKLERI.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="shrink-0 rounded-full px-4 py-3 text-on-deep/80 transition-colors hover:bg-white/10 hover:text-on-deep"
          >
            {l.ad}
          </a>
        ))}
        <Link href={ctaHref} className="shrink-0 rounded-full bg-[#ff4d42] px-5 py-3 text-[#2a0d0b]">
          {ctaLabel}
        </Link>
      </nav>
    </>
  );
}
