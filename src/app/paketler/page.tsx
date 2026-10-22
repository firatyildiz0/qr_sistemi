import type { Metadata } from "next";
import Link from "next/link";
import { getProfile } from "@/lib/profile";
import { MONTHLY_PRICE_TRY, VAT_RATE, netPrice } from "@/lib/subscription";
import { ABONELIK, SATICI } from "@/lib/yasal";
import { bricolage } from "@/lib/fonts";
import SiteFooter from "@/components/SiteFooter";
import VoyoLogo from "@/components/marketing/VoyoLogo";
import { IconArrowRight, IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: `Paketler — ${SATICI.urun}`,
  description: `${ABONELIK.ad}: ${ABONELIK.fiyat} / ay, KDV dahil. Bütün özellikler tek pakette, iyzico ile kartla ödeme, istediğiniz zaman iptal.`,
};

const TRY = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 2,
});

const ADIMLAR = [
  { baslik: "Hesap açın", metin: "E-posta adresiniz, bir kullanıcı adı ve şifreyle üye olun." },
  {
    baslik: "Kartınızı girin",
    metin: "Ödeme iyzico'nun güvenli formunda alınır; kart bilgileriniz sitemizde saklanmaz.",
  },
  { baslik: "Panel açılır", metin: "Ödeme onaylandığı anda panele girip ürünlerinizi eklemeye başlarsınız." },
];

/**
 * Herkese açık paket sayfası.
 *
 * Ödeme kuruluşu (iyzico) abonelik modülünü açmadan önce paketlerin sitede
 * oturum açmadan görülebilmesini ve satın alınabilmesini istiyor; bu sayfanın
 * adresi ona gönderilen bağlantı. Fiyat, kapsam ve dönem `lib/yasal.ts` ile
 * `lib/subscription.ts`'ten okunuyor — sözleşmeler ve ödeme ekranı da aynı
 * yerden okuyor, ikisi ayrışamasın.
 *
 * "Satın al" oturumu kapalı ziyaretçiyi kayıt ekranına götürüyor; kayıt onay
 * beklemeden ödeme ekranına geçiyor. Oturumu açık olan doğrudan ödeme
 * ekranına gidiyor, aboneyse orada durumunu görüyor.
 */
export default async function PaketlerPage() {
  const profile = await getProfile();
  const odemeyeGit = profile?.status === "approved" ? "/abonelik" : "/signup";

  return (
    <div className={`vitrin ${bricolage.variable} flex min-h-screen flex-col bg-surface`}>
      <nav aria-label="Ana menü" className="border-b border-border">
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="text-ink">
            <VoyoLogo />
          </Link>
          {!profile && (
            <Link
              href="/login"
              className="text-[15px] font-semibold text-ink transition-colors hover:text-accent"
            >
              Giriş yap
            </Link>
          )}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-14 sm:px-6 sm:py-20">
        <header className="mb-10 max-w-2xl">
          <p className="m-0 text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
            {SATICI.urun} paketleri
          </p>
          <h1 className="vitrin-baslik mt-2 mb-0 text-[36px] font-extrabold leading-tight text-ink sm:text-[48px]">
            Tek paket, bütün özellikler
          </h1>
          <p className="mt-4 mb-0 text-lg leading-relaxed text-ink-muted">
            Aylık abonelikle {SATICI.urun}&apos;ın her özelliğini kullanırsınız. Taahhüt yok,
            dilediğiniz zaman iptal edebilirsiniz.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <section
            aria-labelledby="paket-adi"
            className="flex flex-col rounded-[32px] border border-border bg-paper p-7 sm:p-9"
          >
            <h2 id="paket-adi" className="vitrin-baslik m-0 text-2xl font-extrabold text-ink">
              {ABONELIK.ad}
            </h2>

            <p className="mt-6 mb-0 flex items-baseline gap-1.5">
              <span className="vitrin-baslik text-[52px] font-extrabold leading-none text-ink">
                {TRY.format(MONTHLY_PRICE_TRY)}
              </span>
              <span className="text-ink-muted">/ ay</span>
            </p>
            <p className="mt-2 mb-0 text-sm text-ink-muted">
              KDV dahil ({TRY.format(netPrice())} + %{VAT_RATE * 100} KDV)
            </p>

            <ul className="mt-7 mb-0 list-none space-y-3 p-0">
              {ABONELIK.kapsam.map((madde) => (
                <li key={madde} className="flex items-start gap-2.5 text-[15px] text-ink">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {madde}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-8">
              <Link href={odemeyeGit} className="btn btn-primary h-13 w-full text-base">
                Satın al
                <IconArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <p className="mt-3 mb-0 text-xs leading-relaxed text-ink-muted">
                Abonelik her ay aynı karttan otomatik yenilenir. İptal ettiğinizde ödediğiniz
                dönemin sonuna kadar kullanmaya devam edersiniz.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="nasil-alinir"
            className="flex flex-col rounded-[32px] bg-deep p-7 text-on-deep sm:p-9"
          >
            <h2 id="nasil-alinir" className="vitrin-baslik m-0 text-2xl font-extrabold">
              Nasıl satın alınır
            </h2>

            <ol className="mt-6 mb-0 list-none space-y-5 p-0">
              {ADIMLAR.map((adim, sira) => (
                <li key={adim.baslik} className="flex gap-4">
                  <span className="vitrin-baslik flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-dark text-sm font-extrabold">
                    {sira + 1}
                  </span>
                  <div>
                    <p className="m-0 font-semibold">{adim.baslik}</p>
                    <p className="mt-1 mb-0 text-sm leading-relaxed text-on-deep/70">{adim.metin}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="mt-auto flex flex-col gap-4 border-t border-border-dark pt-6">
              {/* Zemin her iki temada da koyu: logonun beyaz sürümü. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG, optimizasyon gerekmez */}
              <img
                src="/odeme/iyzico-ile-ode-beyaz.svg"
                alt="iyzico ile Öde"
                width={210}
                height={31}
                className="h-7 w-auto self-start"
              />
              <p className="m-0 text-xs leading-relaxed text-on-deep/70">
                Kredi kartı veya banka kartıyla ödenir. Satın alarak{" "}
                <Link href="/on-bilgilendirme-formu" className="link-underline text-on-deep">
                  Ön Bilgilendirme Formu
                </Link>
                ,{" "}
                <Link href="/mesafeli-satis-sozlesmesi" className="link-underline text-on-deep">
                  Mesafeli Satış Sözleşmesi
                </Link>{" "}
                ve{" "}
                <Link href="/teslimat-ve-iade" className="link-underline text-on-deep">
                  Teslimat ve İade Şartları
                </Link>
                &apos;nı kabul etmiş olursunuz.
              </p>
            </div>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
