import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, homePathFor } from "@/lib/profile";
import SiteFooter from "@/components/SiteFooter";
import { ABONELIK } from "@/lib/yasal";
import { vitrinSayilari } from "@/lib/vitrin";
import { bricolage } from "@/lib/fonts";
import Counter from "@/components/marketing/Counter";
import QrEtiket from "@/components/marketing/QrEtiket";
import BolumImleci, { type Bolum } from "@/components/marketing/BolumImleci";
import HizmetYelpazesi from "@/components/marketing/HizmetYelpazesi";
import VitrinMenu from "@/components/marketing/VitrinMenu";
import { IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Voyo Labs — RentQR ile QR etiketle kiralama",
  description:
    "Voyo Labs işletmeler için yazılım geliştiriyor. İlk hizmeti RentQR ile kiraya verdiğiniz ürüne QR etiket yapıştırın; müşteri okutup boş günü seçsin ve rezervasyon talebini bıraksın.",
};

const BOLUMLER: Bolum[] = [
  { id: "giris", ad: "Başlangıç" },
  { id: "nasil", ad: "Nasıl çalışır" },
  { id: "panel", ad: "Panel" },
  { id: "fiyat", ad: "Fiyat" },
  { id: "hizmetler", ad: "Hizmetler" },
];

/** Bir kiralamanın sırası; gerçekten bir sıra olduğu için numaralı. */
const ADIMLAR = [
  {
    baslik: "Ürünü ekleyin",
    metin: "Ürünün adını, günlük fiyatını ve fotoğrafını girin. QR kod ve barkod numarası otomatik oluşur.",
  },
  {
    baslik: "Etiketi yapıştırın",
    metin: "Etiketi PNG ya da PDF olarak indirin, yazdırıp ürüne yapıştırın. Etikette ürün adı ve barkod numarası da yazar.",
  },
  {
    baslik: "Müşteri okutur",
    metin: "Etiketi telefonuyla okutur, boş günleri görür, tarih seçer ve adıyla telefon numarasını yazıp talep gönderir.",
  },
  {
    baslik: "Siz onaylarsınız",
    metin: "Talep panelinize düşer; onayladığınızda rezervasyon kesinleşir. Dolu günlere talep gönderilemez.",
  },
];

const PANEL = [
  { baslik: "Hangi ürün kimde", metin: "Yaklaşan, süren ve biten kiralamalar tek listede. Her ürünün geçmişi kendi kartında." },
  { baslik: "İade hatırlatması", metin: "İadesi yaklaşan kiralamalar her sabah panelde bildirim olarak görünür." },
  {
    baslik: "Görselle bulma",
    metin: "Etiketi okunmayan ürünü telefon kamerasına gösterin, hangi ürün olduğunu bulsun. Fotoğraf telefonunuzdan çıkmaz.",
  },
  {
    baslik: "Barkodla bulma",
    metin: "Ürünlerinizde barkod varsa yeni etiket basmanıza gerek yok; barkodu okutunca ürün açılır.",
  },
  { baslik: "Raporlar", metin: "Son 30 günün rezervasyonları ve doluluk oranınız tek ekranda." },
  { baslik: "Telefonda panel", metin: "Paneli telefonunuzun ana ekranına ekleyip uygulama gibi açın." },
];

const FIYAT_MADDELERI = ["Sınırsız ürün ve QR etiketi", "Bütün özellikler dahil", "İstediğiniz zaman iptal edin"];

/**
 * Sitenin anasayfası: Voyo Labs'in kapağı, RentQR'ın tanıtımı.
 *
 * Voyo Labs bir çatı; RentQR onun ilk hizmeti. Sayfa RentQR'ı baştan sona
 * anlatıyor (etiket, akış, panel, fiyat) ve en sonda Voyo'nun hizmetlerini
 * yelpaze gibi gösteriyor — yeni hizmetler oraya ekleniyor. Eskiden ayrı
 * duran `/veyro-labs` vitrini buraya, `#hizmetler`'e yönleniyor.
 *
 * Adrese kim gelirse gelsin burası açılıyor. Düğmenin gittiği yeri profil
 * belirliyor: onaylı hesap kendi paneline, onay bekleyen ya da oturumu kapalı
 * olan giriş ekranına — panele giremeyecek birine "Panele git" denmiyor.
 */
export default async function Home() {
  const [user, profile, sayilar] = await Promise.all([getCurrentUser(), getProfile(), vitrinSayilari()]);
  const onayli = profile?.status === "approved";
  const ctaHref = onayli ? homePathFor(profile) : "/login";
  const ctaLabel = onayli ? "Panele git" : "Hemen başla";

  return (
    <div className={`vitrin ${bricolage.variable} relative flex flex-1 flex-col`}>
      <VitrinMenu girisGoster={!user} ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <BolumImleci bolumler={BOLUMLER} />

      <main className="pt-20 pb-24 sm:pb-0">
        {/* KAHRAMAN — sayfanın tek gösterişli nesnesi etiketin kendisi. */}
        <section
          id="giris"
          className="mx-auto flex max-w-[1200px] scroll-mt-28 flex-col items-center gap-14 px-6 pb-24 pt-12 lg:flex-row lg:pb-28 lg:pt-16"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <h1 className="vitrin-baslik m-0 text-[42px] font-extrabold leading-[0.98] text-balance text-ink sm:text-[60px] lg:text-[70px]">
              Ürününüze QR etiket yapıştırın. Müşteri okutsun, rezervasyonunu kendisi yapsın.
            </h1>
            <p className="m-0 max-w-[520px] text-lg leading-relaxed text-ink-muted">
              Voyo Labs işletmeler için yazılım geliştiriyor. İlk hizmetimiz RentQR, kiraya verdiğiniz her ürün
              için bir QR etiket oluşturur. Müşteri etiketi telefonuyla okutur, boş günleri görür ve rezervasyon
              talebini bırakır; siz onaylayınca kesinleşir.
            </p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href={ctaHref} className="btn btn-primary h-14 px-8 text-base">
                {ctaLabel}
              </Link>
              <a href="#nasil" className="btn btn-secondary h-14 px-6 text-base">
                Nasıl çalışır?
              </a>
            </div>

            {/* Canlı veritabanından (bkz. lib/vitrin.ts); okunamazsa hiç
                çizilmiyor — uydurma ya da sıfır bir sayı gösterilmesin. */}
            {sayilar && (
              <dl className="m-0 mt-3 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
                {[
                  { deger: sayilar.urun, etiket: "listelenen ürün" },
                  { deger: sayilar.rezervasyon, etiket: "rezervasyon" },
                  { deger: sayilar.isletme, etiket: "RentQR kullanan işletme" },
                ].map((oge) => (
                  <div key={oge.etiket} className="flex flex-col-reverse gap-0.5">
                    <dt className="text-sm text-ink-muted">{oge.etiket}</dt>
                    <dd className="vitrin-baslik m-0 text-3xl font-extrabold tabular-nums text-ink">
                      <Counter target={oge.deger} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="flex w-full min-w-0 flex-1 justify-center">
            <QrEtiket />
          </div>
        </section>

        {/* NASIL ÇALIŞIR */}
        <section id="nasil" className="scroll-mt-20 bg-card">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-12 px-6 py-24">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <h2 className="vitrin-baslik m-0 max-w-2xl text-[34px] font-extrabold leading-[1.02] text-balance text-ink sm:text-[52px]">
                Dört adımda kiralamaya hazır
              </h2>
              <p className="m-0 max-w-sm text-[17px] leading-relaxed text-ink-muted">
                Müşterinizin uygulama indirmesi ya da üye olması gerekmez. Telefonunun kamerası yeterli.
              </p>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {ADIMLAR.map((adim, i) => {
                const son = i === ADIMLAR.length - 1;
                return (
                  <li
                    key={adim.baslik}
                    className={`flex flex-col gap-3.5 rounded-[24px] p-7 ${son ? "bg-deep text-on-deep" : "bg-paper"}`}
                  >
                    <span className={`vitrin-baslik text-[44px] font-extrabold leading-none ${son ? "text-[#ff6b61]" : "text-accent"}`}>
                      {i + 1}
                    </span>
                    <h3 className="m-0 text-[19px] font-extrabold">{adim.baslik}</h3>
                    <p className={`m-0 text-[15px] leading-relaxed ${son ? "text-on-deep/75" : "text-ink-muted"}`}>
                      {adim.metin}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* PANEL */}
        <section id="panel" className="mx-auto flex max-w-[1200px] scroll-mt-24 flex-wrap gap-14 px-6 py-24">
          <div className="min-w-0 flex-[1_1_320px]">
            <h2 className="vitrin-baslik m-0 mb-4 text-[32px] font-extrabold leading-[1.04] text-ink sm:text-[46px]">
              Kiralamalarınızı tek panelden yönetin
            </h2>
            <p className="m-0 max-w-sm text-[17px] leading-relaxed text-ink-muted">
              Gelinlikten kameraya, kamp çadırından bisiklete; üzerine etiket yapıştırabildiğiniz her ürün için
              çalışır.
            </p>
          </div>
          <dl className="m-0 grid min-w-0 flex-[2_1_560px] grid-cols-1 gap-x-10 sm:grid-cols-2">
            {PANEL.map((oge) => (
              <div key={oge.baslik} className="border-t-[1.5px] border-ink py-5">
                <dt className="mb-1.5 text-lg font-extrabold text-ink">{oge.baslik}</dt>
                <dd className="m-0 text-[15px] leading-relaxed text-ink-muted">{oge.metin}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* FİYAT — ödeme kuruluşu incelemesi fiyatı, ödeme yöntemini ve
            sözleşme bağlantılarını sitede açıkça görmek istiyor. */}
        <section id="fiyat" className="scroll-mt-28 px-3 pb-24 sm:px-6">
          <div className="mx-auto flex max-w-[1152px] flex-col gap-8 rounded-[32px] bg-deep p-8 text-on-deep sm:p-12">
            <div className="flex flex-wrap items-center justify-between gap-8">
              <div className="flex flex-col gap-4">
                <h2 className="vitrin-baslik m-0 text-[32px] font-extrabold">{ABONELIK.ad}</h2>
                <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-[15px] text-on-deep/80">
                  {FIYAT_MADDELERI.map((madde) => (
                    <li key={madde} className="flex items-center gap-2">
                      <IconCheck className="h-4 w-4 shrink-0 text-[#ff6b61]" />
                      {madde}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-7">
                <p className="m-0 flex items-baseline gap-1.5">
                  <span className="vitrin-baslik text-[56px] font-extrabold leading-none">{ABONELIK.fiyat}</span>
                  <span className="text-on-deep/70">/ ay</span>
                </p>
                {/* Ziyaretçi paket sayfasına, oradan kayıt ve ödemeye gidiyor.
                    Onaylı hesap ise doğrudan paneline. */}
                <Link href={onayli ? ctaHref : "/paketler"} className="btn btn-primary h-13 px-8 text-base">
                  {onayli ? "Panele git" : "Satın al"}
                </Link>
              </div>
            </div>
            <div className="flex flex-col gap-4 border-t border-border-dark pt-6 sm:flex-row sm:items-center sm:gap-6">
              {/* Zemin her iki temada da koyu: logonun beyaz sürümü. */}
              {/* eslint-disable-next-line @next/next/no-img-element -- statik SVG, optimizasyon gerekmez */}
              <img src="/odeme/iyzico-ile-ode-beyaz.svg" alt="iyzico ile Öde" width={210} height={31} className="h-7 w-auto shrink-0 self-start sm:self-center" />
              <p className="m-0 text-xs leading-relaxed text-on-deep/70">
                Ödemeler iyzico güvencesiyle kredi kartı veya banka kartı ile alınır. Satın alarak{" "}
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
                ’nı kabul etmiş olursunuz.
              </p>
            </div>
          </div>
        </section>

        {/* HİZMETLER — Voyo Labs'in hizmetleri, yelpaze gibi. */}
        <section id="hizmetler" className="scroll-mt-20">
          <HizmetYelpazesi
            ctaHref={ctaHref}
            baslik="Voyo Labs hizmetleri"
            aciklama="RentQR ilk hizmetimiz. Yenileri hazır oldukça burada yer alacak."
          />
        </section>
      </main>

      <SiteFooter
        className="pb-32 sm:pb-12"
        ekLinkler={
          <Link
            href={ctaHref}
            className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            {onayli ? "Panel" : "Giriş yap"}
          </Link>
        }
      />

      {/* Telefonda sayfanın altına sabitlenen eylem çubuğu: birincil düğme her
          zaman parmağın altında. Masaüstünde üst çubukta zaten duruyor. */}
      <div className="tab-bar safe-b fixed inset-x-0 bottom-0 z-50 px-4 pt-3 sm:hidden">
        <Link href={ctaHref} className="btn btn-primary h-13 w-full text-base">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
