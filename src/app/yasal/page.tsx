import type { Metadata } from "next";
import Link from "next/link";
import { SirketKunyesi } from "@/components/yasal/YasalSayfa";
import { BELGELER, GUNCELLEME } from "@/lib/yasal";

export const metadata: Metadata = {
  title: "Yasal Metinler — RentQR",
  description: "RentQR'ın gizlilik politikası, KVKK aydınlatma metni, çerez politikası ve sözleşmeleri.",
};

/** Bütün yasal metinlerin tek bir adresten bulunabildiği liste. */
export default function YasalPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="space-y-3 border-b border-border pb-8">
        <Link
          href="/"
          className="text-sm font-medium text-ink-muted transition-colors hover:text-accent-hover"
        >
          ← RentQR
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">Yasal metinler</h1>
        <p className="text-ink-muted">
          RentQR’ı kullanırken geçerli olan politika ve sözleşmeler. Son güncelleme: {GUNCELLEME}.
        </p>
      </header>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2">
        {BELGELER.map((belge) => (
          <li key={belge.href}>
            <Link href={belge.href} className="card card-hover block h-full">
              <span className="block text-lg font-bold text-ink">{belge.baslik}</span>
              <span className="mt-1 block text-sm text-ink-muted">{belge.ozet}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-14 space-y-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">Şirket bilgileri</h2>
        <SirketKunyesi />
      </section>
    </main>
  );
}
