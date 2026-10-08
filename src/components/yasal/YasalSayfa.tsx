import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import { SATICI } from "@/lib/yasal";

/**
 * Yasal metinlerin ortak iskeleti: başlık, güncelleme tarihi, bölümler ve
 * altta ödeme logolarını taşıyan site altbilgisi. Sayfalar herkese açık ve
 * oturum istemez — ödeme kuruluşu incelemesi dışarıdan açabilmeli.
 */

export function YasalSayfa({
  baslik,
  guncelleme,
  giris,
  children,
}: {
  baslik: string;
  guncelleme: string;
  giris: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
        <header className="space-y-3 border-b border-border pb-8">
          <Link
            href="/"
            className="text-sm font-medium text-ink-muted transition-colors hover:text-accent-hover"
          >
            ← {SATICI.urun}
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{baslik}</h1>
          <p className="text-ink-muted">
            Son güncelleme: {guncelleme}. {giris}
          </p>
        </header>

        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </>
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

export function Paragraf({ children }: { children: React.ReactNode }) {
  return <p className="text-ink-muted">{children}</p>;
}

export function Liste({ maddeler }: { maddeler: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 text-ink-muted">
      {maddeler.map((madde, sira) => (
        <li key={sira} className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span>{madde}</span>
        </li>
      ))}
    </ul>
  );
}

export function Vurgu({ children }: { children: React.ReactNode }) {
  return <strong className="font-semibold text-ink">{children}</strong>;
}

export function EpostaLink() {
  return (
    <a href={`mailto:${SATICI.eposta}`} className="link-underline font-medium text-accent">
      {SATICI.eposta}
    </a>
  );
}

/**
 * Etiket–değer tablosu: satıcı künyesi, alıcı bilgileri ve sipariş özeti aynı
 * görünümü paylaşır. Yazı boyutu gövdeyle aynı (16px ≈ 12 punto); Mesafeli
 * Sözleşmeler Yönetmeliği ön bilgilerin en az 12 punto verilmesini istiyor,
 * o yüzden burada küçük yazı kullanılmıyor.
 */
export function BilgiTablosu({ satirlar }: { satirlar: [string, React.ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr]">
      {satirlar.map(([etiket, deger]) => (
        <div key={etiket} className="contents">
          <dt className="font-semibold text-ink">{etiket}</dt>
          <dd className="mb-2 text-ink-muted sm:mb-0">{deger}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Ödeme adımında alıcının bilgileriyle dolan alanların yer tutucusu. */
export function OdemedeDoldurulur() {
  return <span className="italic">Ödeme adımında doldurulur</span>;
}

/** Satıcı künyesi: sözleşmede, iade şartlarında ve hakkımızda aynı tablo. */
export function SaticiKunyesi() {
  const satirlar: [string, React.ReactNode][] = [
    ["Unvan", `${SATICI.unvan} (${SATICI.marka})`],
    ["Adres", SATICI.adres],
    ["Vergi dairesi / No", `${SATICI.vergiDairesi} / ${SATICI.vergiNo}`],
  ];
  if (SATICI.mersisNo) satirlar.push(["MERSİS No", SATICI.mersisNo]);
  satirlar.push(
    [
      "Telefon",
      <a key="t" href={SATICI.telefonHref} className="link-underline font-medium text-accent">
        {SATICI.telefon}
      </a>,
    ],
    ["E-posta", <EpostaLink key="e" />]
  );
  return <BilgiTablosu satirlar={satirlar} />;
}
