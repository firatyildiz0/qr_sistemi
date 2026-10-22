import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { bricolage } from "@/lib/fonts";
import VoyoLogo from "@/components/marketing/VoyoLogo";
import TemaDugmesi from "@/components/marketing/TemaDugmesi";
import FikirFormu from "@/components/marketing/FikirFormu";

export const metadata: Metadata = {
  title: "Fikriniz mi var? — Voyo Labs",
  description:
    "İşinizde hâlâ defterle ya da telefonla yürüyen bir iş varsa anlatın. Voyo Labs bir sonraki hizmetini sizin fikrinizden geliştirebilir.",
};

const ORNEKLER = [
  "Randevuları defterden takip ediyorum",
  "Siparişleri WhatsApp'tan topluyorum",
  "Stoğu her akşam elle sayıyorum",
];

/**
 * Anasayfadaki "Fikriniz mi var?" kartının açtığı sayfa. Görünüşü anasayfanın
 * (vitrin) aynısı: aynı başlık yazısı, aynı koyu kart, aynı düğmeler. Gönderilen
 * öneri yönetim panelinin Fikirler sekmesine düşüyor.
 */
export default function FikirPage() {
  return (
    <div className={`vitrin ${bricolage.variable} relative flex flex-1 flex-col`}>
      <nav aria-label="Ana menü" className="mx-auto flex h-[72px] w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="text-ink">
          <VoyoLogo />
        </Link>
        <div className="flex items-center gap-5 text-[15px] font-bold">
          <TemaDugmesi className="-mr-2 md:mr-0" />
          <Link href="/#hizmetler" className="hidden text-ink transition-colors hover:text-accent sm:block">
            Hizmetler
          </Link>
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-12 px-6 pb-24 pt-10 lg:flex-row lg:gap-16 lg:pt-16">
        <div className="flex min-w-0 flex-col gap-7 lg:w-[420px] lg:shrink-0">
          <h1 className="vitrin-baslik m-0 text-[42px] font-extrabold leading-[0.98] text-balance text-ink sm:text-[60px]">
            Fikriniz mi var?
          </h1>
          <p className="m-0 max-w-[480px] text-lg leading-relaxed text-ink-muted">
            İşinizde hâlâ defterle ya da telefonla yürüyen bir iş varsa anlatın. Bir sonraki hizmetimizi sizin
            fikrinizden geliştirebiliriz.
          </p>

          <div className="flex flex-col gap-5 rounded-[24px] bg-deep p-7 text-on-deep">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-14 w-14"
              fill="none"
              stroke="#ff8a82"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 5h16v11H9l-5 4z" />
              <path d="M8 9.5h8M8 12.5h5" />
            </svg>
            <p className="m-0 text-[15px] font-bold">Örneğin şöyle başlayabilirsiniz:</p>
            <ul className="m-0 flex list-none flex-col gap-2.5 p-0 text-[15px] text-on-deep/80">
              {ORNEKLER.map((ornek) => (
                <li key={ornek} className="flex items-start gap-2.5">
                  <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff6b61]" />
                  {ornek}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <section aria-label="Öneri formu" className="min-w-0 flex-1 rounded-[32px] bg-card p-6 sm:p-10">
          <FikirFormu />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
