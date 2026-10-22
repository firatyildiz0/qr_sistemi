import SiteFooter from "@/components/SiteFooter";
import VitrinMenu from "@/components/marketing/VitrinMenu";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, homePathFor } from "@/lib/profile";
import { bricolage } from "@/lib/fonts";
import { SATICI } from "@/lib/yasal";

/**
 * Yasal metinlerin ortak iskeleti: başlık, güncelleme tarihi, bölümler ve
 * altta ödeme logolarını taşıyan site altbilgisi. Sayfalar herkese açık ve
 * oturum istemez — ödeme kuruluşu incelemesi dışarıdan açabilmeli.
 *
 * Üstte anasayfanın menüsü duruyor ama bölüm bağlantıları olmadan; düğmesi
 * anasayfadakiyle aynı kurala uyuyor (onaylı hesap paneline, diğerleri girişe).
 */

export async function YasalSayfa({
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
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);
  const onayli = profile?.status === "approved";

  return (
    <div className={`vitrin ${bricolage.variable} relative flex flex-1 flex-col`}>
      <VitrinMenu
        girisGoster={!user}
        ctaHref={onayli ? homePathFor(profile) : "/login"}
        ctaLabel={onayli ? "Panele git" : "Hemen başla"}
        bolumler={false}
      />
      <main className="mx-auto w-full max-w-3xl px-6 pb-12 pt-28 sm:pb-16 sm:pt-32">
        <header className="space-y-3 border-b border-border pb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{baslik}</h1>
          <p className="text-ink-muted">
            Son güncelleme: {guncelleme}. {giris}
          </p>
        </header>

        <div className="mt-10 space-y-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
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
    <section id={id} className="scroll-mt-24 space-y-3">
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

/** Satıcı künyesi: sözleşmede, iade şartlarında ve hakkımızda aynı tablo. */
export function SaticiKunyesi() {
  const satirlar: [string, React.ReactNode][] = [
    ["Unvan", `${SATICI.unvan} (${SATICI.marka})`],
    ["Adres", SATICI.adres],
    ["Vergi dairesi / No", `${SATICI.vergiDairesi} / ${SATICI.vergiNo}`],
    [
      "Telefon",
      <a key="t" href={SATICI.telefonHref} className="link-underline font-medium text-accent">
        {SATICI.telefon}
      </a>,
    ],
    ["E-posta", <EpostaLink key="e" />],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-2xl border border-border bg-card p-5 text-sm sm:grid-cols-[auto_1fr]">
      {satirlar.map(([etiket, deger]) => (
        <div key={etiket} className="contents">
          <dt className="font-semibold text-ink">{etiket}</dt>
          <dd className="mb-2 text-ink-muted sm:mb-0">{deger}</dd>
        </div>
      ))}
    </dl>
  );
}
