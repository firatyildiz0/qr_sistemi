import Link from "next/link";
import { BELGELER, GUNCELLEME, SIRKET, belirsizMi, type SirketAlani } from "@/lib/yasal";

/**
 * Yasal metinlerin ortak iskeleti. Bütün metinler aynı başlık, aynı "diğer
 * metinler" listesi ve aynı alt bilgiyle açılıyor; okuyan biri gizlilikten
 * sözleşmeye geçerken ayrı bir siteye düşmüş gibi hissetmesin.
 *
 * Sayfalar herkese açık ve oturum istemiyor: üye olmadan önce okunabilmeleri
 * gerekiyor.
 */
export default function YasalSayfa({
  href,
  baslik,
  giris,
  children,
}: {
  href: string;
  baslik: string;
  giris: React.ReactNode;
  children: React.ReactNode;
}) {
  const digerleri = BELGELER.filter((belge) => belge.href !== href);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="space-y-3 border-b border-border pb-8">
        <nav className="flex items-center gap-2 text-sm font-medium text-ink-muted">
          <Link href="/" className="transition-colors hover:text-accent-hover">
            ← RentQR
          </Link>
          <span aria-hidden>/</span>
          <Link href="/yasal" className="transition-colors hover:text-accent-hover">
            Yasal metinler
          </Link>
        </nav>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{baslik}</h1>
        <p className="text-ink-muted">
          Son güncelleme: {GUNCELLEME}. {giris}
        </p>
      </header>

      <div className="mt-10 space-y-10">{children}</div>

      <nav aria-label="Diğer yasal metinler" className="mt-14 border-t border-border pt-8">
        <h2 className="eyebrow text-ink-muted">Diğer yasal metinler</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {digerleri.map((belge) => (
            <li key={belge.href}>
              <Link href={belge.href} className="card card-hover block h-full">
                <span className="block font-semibold text-ink">{belge.baslik}</span>
                <span className="mt-1 block text-sm text-ink-muted">{belge.ozet}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <footer className="mt-12 border-t border-border pt-8 text-sm text-ink-muted">
        <p>
          Sorularınız için: <Eposta />
        </p>
        <p className="mt-2">
          © {new Date().getFullYear()} {SIRKET.marka} — RentQR
        </p>
      </footer>
    </main>
  );
}

export function Bolum({
  id,
  baslik,
  children,
}: {
  id?: string;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-ink">{baslik}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-muted">{children}</p>;
}

export function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

export function Liste({ maddeler }: { maddeler: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 text-ink-muted">
      {maddeler.map((madde, sira) => (
        <li key={sira} className="flex gap-2.5">
          <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span>{madde}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Sözleşmelerin numaralı alt maddeleri: `no` 4 ise maddeler 4.1, 4.2… diye
 * sıralanır. Numara metnin parçası, çünkü sözleşmelerde maddeye numarasıyla
 * atıf yapılıyor ("bkz. madde 8.2").
 */
export function Maddeler({ no, maddeler }: { no: number; maddeler: React.ReactNode[] }) {
  return (
    <ol className="space-y-2.5 text-ink-muted">
      {maddeler.map((madde, sira) => (
        <li key={sira} className="flex gap-3">
          <span className="w-8 shrink-0 font-semibold tabular-nums text-ink">
            {no}.{sira + 1}
          </span>
          <span className="min-w-0">{madde}</span>
        </li>
      ))}
    </ol>
  );
}

export function Eposta() {
  return (
    <a href={`mailto:${SIRKET.eposta}`} className="link-underline font-medium text-accent">
      {SIRKET.eposta}
    </a>
  );
}

export function IcBaglanti({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="link-underline font-medium text-accent">
      {children}
    </Link>
  );
}

/**
 * Şirket künyesinden tek bir alan. Değer henüz belirlenmemişse (köşeli
 * parantezli yer tutucu) işaretli gösteriliyor: metni yayına almadan önce
 * doldurulması gereken yer sayfaya bakınca görünsün.
 */
export function Sirket({ alan }: { alan: SirketAlani }) {
  const deger = SIRKET[alan];
  if (alan === "eposta") return <Eposta />;
  if (belirsizMi(deger)) {
    return (
      <mark className="rounded bg-accent-soft px-1 font-semibold text-accent-strong">{deger}</mark>
    );
  }
  return <>{deger}</>;
}

/** Veri sorumlusu / satıcı kimliği. KVKK ve mesafeli satış bunu zorunlu tutuyor. */
export function SirketKunyesi() {
  const satirlar: [string, SirketAlani][] = [
    ["Unvan", "unvan"],
    ["Adres", "adres"],
    ["Vergi dairesi", "vergiDairesi"],
    ["Vergi numarası", "vergiNo"],
    ["MERSİS numarası", "mersis"],
    ["Telefon", "telefon"],
    ["E-posta", "eposta"],
    ["KEP adresi", "kep"],
  ];

  return (
    <dl className="card grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
      {satirlar.map(([etiket, alan]) => (
        <div key={alan} className="contents">
          <dt className="font-semibold text-ink">{etiket}</dt>
          <dd className="text-ink-muted">
            <Sirket alan={alan} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
