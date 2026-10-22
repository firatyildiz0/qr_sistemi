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
import HizmetSeridi from "@/components/marketing/HizmetSeridi";
import BolumImleci, { type Bolum } from "@/components/marketing/BolumImleci";
import HizmetYelpazesi from "@/components/marketing/vitrin/HizmetYelpazesi";
import VitrinMenu from "@/components/marketing/vitrin/VitrinMenu";
import SecenekPaneli from "@/components/marketing/vitrin/SecenekPaneli";
import { MENU_BOSLUGU, secimiOku } from "@/components/marketing/vitrin/secenekler";
import { IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Voyo Labs — RentQR ile QR etiketle kiralama",
  description:
    "Voyo Labs işletmeler için yazılım geliştiriyor. İlk hizmeti RentQR ile kiraya verdiğiniz ürüne QR etiket yapıştırın; müşteri okutup boş günü seçsin ve rezervasyon yapsın.",
};

const BOLUMLER: Bolum[] = [
  { id: "giris", ad: "Başlangıç" },
  { id: "nasil", ad: "Nasıl çalışır" },
  { id: "panel", ad: "Panel" },
  { id: "fiyat", ad: "Fiyat" },
  { id: "hizmetler", ad: "Hizmetler" },
];

type Metin = {
  heroBaslik: string;
  heroMetin: string;
  ikinciDugme: string;
  sayaclar: [string, string, string];
  adimBaslik: string;
  adimAciklama: string;
  adimlar: { baslik: string; metin: string }[];
  panelBaslik: string;
  panelAciklama: string;
  panel: { baslik: string; metin: string }[];
  fiyatMaddeleri: string[];
  aboneDugme: string;
  hizmetBaslik: string;
  hizmetAciklama: string;
};

/**
 * Sayfanın bütün metinleri, iki hâliyle: şimdiki ve metin incelemesinden sonra
 * önerilen. Kullanıcı seçim panelinden ikisini karşılaştırıyor; karar
 * verildiğinde biri kalkacak.
 */
const METINLER: Record<"eski" | "yeni", Metin> = {
  eski: {
    heroBaslik: "Ürününüze bir etiket yapıştırın. Rezervasyonu o alsın.",
    heroMetin:
      "Voyo Labs işletmeler için yazılım hizmetleri geliştiriyor. İlki RentQR: kiraya verdiğiniz her ürüne bir QR etiket basılıyor; müşteri onu telefonuyla okutup boş günleri görüyor ve rezervasyonunu bırakıyor.",
    ikinciDugme: "Nasıl çalıştığını gör",
    sayaclar: ["listelenen ürün", "rezervasyon", "işletme"],
    adimBaslik: "Ürünü eklediğiniz andan teslim gününe kadar",
    adimAciklama: "Müşterinizin uygulama indirmesi, üye olması gerekmiyor. Telefonun kamerası yetiyor.",
    adimlar: [
      { baslik: "Ürünü ekleyin", metin: "Adını, günlük fiyatını ve fotoğrafını girin. QR kodu ve barkod numarası kendiliğinden üretilir." },
      { baslik: "Etiketi yapıştırın", metin: "PNG ya da PDF olarak indirip yazdırın. Barkod numarası etikette, ürün adının altında çıkar." },
      { baslik: "Müşteri okutur", metin: "Uygulama indirmeden ürünün boş günlerini görür, tarihini seçer, adını ve telefonunu bırakır." },
      { baslik: "Panelinize düşer", metin: "Rezervasyon listenizde görünür. Aynı günlere ikinci bir kayıt daha kaydedilmeden engellenir." },
    ],
    panelBaslik: "Dükkânın arkasında, panelde",
    panelAciklama:
      "Gelinlikten kamera gövdesine, kamp çadırından bisiklete: üstüne etiket yapıştırabildiğiniz her ürün için aynı panel.",
    panel: [
      { baslik: "Hangi ürün kimde", metin: "Yaklaşan, süren ve biten kiralamalar tek listede. Her ürünün geçmişi kendi kartında." },
      { baslik: "İade hatırlatması", metin: "İade günü yaklaşanlar her sabah işaretlenir, zil simgesinde birikir." },
      { baslik: "Etiket yıprandıysa", metin: "Ürünü kameraya gösterin, telefon tanısın. Fotoğraf hiçbir yere gönderilmez." },
      { baslik: "Barkodla bulma", metin: "Barkodlu stoğunuzu baştan etiketlemeyin; barkodu okutun, ürün karşınıza gelsin." },
      { baslik: "Son 30 gün", metin: "Rezervasyon eğilimi, ürün sayınız ve doluluğunuz tek ekranda." },
      { baslik: "Telefonda da panel", metin: "Ana ekrana ekleyin; dükkânda, depoda, teslimatta elinizin altında." },
    ],
    fiyatMaddeleri: ["Sınırsız ürün ve QR etiketi", "Bütün özellikler dahil", "İstediğiniz ay iptal"],
    aboneDugme: "Abone ol",
    hizmetBaslik: "RentQR ilk hizmetimiz, sonuncusu değil",
    hizmetAciklama:
      "Voyo Labs işletmeler için yazılım hizmetleri geliştiriyor. Yenileri üzerinde çalışıyoruz; hazır olanlar bu rafa ekleniyor ve hepsi aynı hesapla açılıyor.",
  },
  yeni: {
    heroBaslik: "Ürününüze QR etiket yapıştırın. Müşteri okutsun, rezervasyonunu kendisi yapsın.",
    heroMetin:
      "Voyo Labs işletmeler için yazılım geliştiriyor. İlk hizmetimiz RentQR, kiraya verdiğiniz her ürün için bir QR etiket oluşturur. Müşteri etiketi telefonuyla okutur, boş günleri görür ve rezervasyon yapar.",
    ikinciDugme: "Nasıl çalışır?",
    sayaclar: ["listelenen ürün", "rezervasyon", "RentQR kullanan işletme"],
    adimBaslik: "Dört adımda kiralamaya hazır",
    adimAciklama: "Müşterinizin uygulama indirmesi ya da üye olması gerekmez. Telefonunun kamerası yeterli.",
    adimlar: [
      { baslik: "Ürünü ekleyin", metin: "Ürünün adını, günlük fiyatını ve fotoğrafını girin. QR kod ve barkod numarası otomatik oluşur." },
      { baslik: "Etiketi yapıştırın", metin: "Etiketi PNG ya da PDF olarak indirin, yazdırıp ürüne yapıştırın. Etikette ürün adı ve barkod numarası da yazar." },
      { baslik: "Müşteri okutur", metin: "Etiketi telefonuyla okutur, boş günleri görür, tarih seçer, adını ve telefon numarasını yazar." },
      { baslik: "Panelinize düşer", metin: "Rezervasyon panelinizdeki listeye düşer. Dolu günlere ikinci rezervasyon yapılamaz." },
    ],
    panelBaslik: "Kiralamalarınızı tek panelden yönetin",
    panelAciklama:
      "Gelinlikten kameraya, kamp çadırından bisiklete; üzerine etiket yapıştırabildiğiniz her ürün için çalışır.",
    panel: [
      { baslik: "Hangi ürün kimde", metin: "Yaklaşan, süren ve biten kiralamalar tek listede. Her ürünün geçmişi kendi kartında." },
      { baslik: "İade hatırlatması", metin: "İadesi yaklaşan kiralamalar her sabah panelde bildirim olarak görünür." },
      { baslik: "Görselle bulma", metin: "Etiketi okunmayan ürünü telefon kamerasına gösterin, hangi ürün olduğunu bulsun. Fotoğraf telefonunuzdan çıkmaz." },
      { baslik: "Barkodla bulma", metin: "Ürünlerinizde barkod varsa yeni etiket basmanıza gerek yok; barkodu okutunca ürün açılır." },
      { baslik: "Raporlar", metin: "Son 30 günün rezervasyonları ve doluluk oranınız tek ekranda." },
      { baslik: "Telefonda panel", metin: "Paneli telefonunuzun ana ekranına ekleyip uygulama gibi açın." },
    ],
    fiyatMaddeleri: ["Sınırsız ürün ve QR etiketi", "Bütün özellikler dahil", "İstediğiniz zaman iptal edin"],
    aboneDugme: "Hesap açın",
    hizmetBaslik: "Voyo Labs hizmetleri",
    hizmetAciklama: "RentQR ilk hizmetimiz. Yenileri hazır oldukça burada yer alacak.",
  },
};

/**
 * Sitenin anasayfası: Voyo Labs'in kapağı, RentQR'ın tanıtımı.
 *
 * Voyo Labs bir çatı; RentQR onun ilk hizmeti. Sayfa RentQR'ı baştan sona
 * anlatıyor (etiket, akış, panel, fiyat) ve en sonda Voyo'nun hizmetlerini
 * gösteriyor. Eskiden ayrı duran `/veyro-labs` vitrini buraya yönleniyor.
 *
 * Logo, menü, bölüm imleci, hizmet görünümü ve metinlerin birden fazla adayı
 * var; hangisinin çizileceğini adres belirliyor (bkz. vitrin/secenekler.ts).
 *
 * Düğmenin gittiği yeri profil belirliyor: onaylı hesap kendi paneline, onay
 * bekleyen ya da oturumu kapalı olan giriş ekranına.
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, profile, sayilar, params] = await Promise.all([
    getCurrentUser(),
    getProfile(),
    vitrinSayilari(),
    searchParams,
  ]);
  const secim = secimiOku(params);
  const m = METINLER[secim.metin];
  const onayli = profile?.status === "approved";
  const ctaHref = onayli ? homePathFor(profile) : "/login";
  const ctaLabel = onayli ? "Panele git" : "Hemen başla";

  return (
    <div className={`vitrin ${bricolage.variable} relative flex flex-1 flex-col`}>
      <VitrinMenu tur={secim.menu} logo={secim.logo} girisGoster={!user} ctaHref={ctaHref} ctaLabel={ctaLabel} />
      <BolumImleci bolumler={BOLUMLER} tur={secim.imlec} />
      <SecenekPaneli secim={secim} />

      <main className={`${MENU_BOSLUGU[secim.menu]} pb-24 sm:pb-0`}>
        {/* KAHRAMAN — sayfanın tek gösterişli nesnesi etiketin kendisi. */}
        <section
          id="giris"
          className="mx-auto flex max-w-[1200px] scroll-mt-28 flex-col items-center gap-14 px-6 pb-24 pt-12 lg:flex-row lg:pb-28 lg:pt-16"
        >
          <div className="flex min-w-0 flex-1 flex-col gap-7">
            <h1 className="vitrin-baslik m-0 text-[42px] font-extrabold leading-[0.98] text-balance text-ink sm:text-[60px] lg:text-[70px]">
              {m.heroBaslik}
            </h1>
            <p className="m-0 max-w-[520px] text-lg leading-relaxed text-ink-muted">{m.heroMetin}</p>
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link href={ctaHref} className="btn btn-primary h-14 px-8 text-base">
                {ctaLabel}
              </Link>
              <a href="#nasil" className="btn btn-secondary h-14 px-6 text-base">
                {m.ikinciDugme}
              </a>
            </div>

            {/* Canlı veritabanından (bkz. lib/vitrin.ts); okunamazsa hiç
                çizilmiyor — uydurma ya da sıfır bir sayı gösterilmesin. */}
            {sayilar && (
              <dl className="m-0 mt-3 flex flex-wrap gap-x-10 gap-y-4 border-t border-border pt-6">
                {[sayilar.urun, sayilar.rezervasyon, sayilar.isletme].map((deger, i) => (
                  <div key={m.sayaclar[i]} className="flex flex-col-reverse gap-0.5">
                    <dt className="text-sm text-ink-muted">{m.sayaclar[i]}</dt>
                    <dd className="vitrin-baslik m-0 text-3xl font-extrabold tabular-nums text-ink">
                      <Counter target={deger} />
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
                {m.adimBaslik}
              </h2>
              <p className="m-0 max-w-sm text-[17px] leading-relaxed text-ink-muted">{m.adimAciklama}</p>
            </div>
            <ol className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-4">
              {m.adimlar.map((adim, i) => {
                const son = i === m.adimlar.length - 1;
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
              {m.panelBaslik}
            </h2>
            <p className="m-0 max-w-sm text-[17px] leading-relaxed text-ink-muted">{m.panelAciklama}</p>
          </div>
          <dl className="m-0 grid min-w-0 flex-[2_1_560px] grid-cols-1 gap-x-10 sm:grid-cols-2">
            {m.panel.map((oge) => (
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
                  {m.fiyatMaddeleri.map((madde) => (
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
                {/* Önerilen metinde düğme "Hesap açın" diyor; söylediğini
                    yapsın diye kayıt ekranına gidiyor. */}
                <Link
                  href={onayli ? ctaHref : secim.metin === "yeni" ? "/signup" : ctaHref}
                  className="btn btn-primary h-13 px-8 text-base"
                >
                  {onayli ? "Panele git" : m.aboneDugme}
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

        {/* HİZMETLER — Voyo Labs'in hizmetleri. */}
        {secim.hizmet === "H1" ? (
          <section id="hizmetler" className="scroll-mt-20 bg-border/60 py-24">
            <HizmetSeridi
              ctaHref={ctaHref}
              ctaLabel={ctaLabel}
              baslik={m.hizmetBaslik}
              aciklama={m.hizmetAciklama}
              yeni={secim.metin === "yeni"}
            />
          </section>
        ) : (
          <section id="hizmetler" className="scroll-mt-20">
            <HizmetYelpazesi ctaHref={ctaHref} baslik={m.hizmetBaslik} aciklama={m.hizmetAciklama} />
          </section>
        )}
      </main>

      <SiteFooter
        className={secim.menu === "N4" ? "pb-36" : "pb-32 sm:pb-12"}
        ekLinkler={
          <Link
            href={ctaHref}
            className="rounded-full px-3 py-2 text-sm text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-hover"
          >
            {onayli ? "Panel" : "Giriş yap"}
          </Link>
        }
      />

      {/* Telefonda sayfanın altına sabitlenen eylem çubuğu. N4'te gerek yok:
          orada menünün kendisi ekranın altında ve düğmeyi taşıyor. */}
      {secim.menu !== "N4" && (
        <div className="tab-bar safe-b fixed inset-x-0 bottom-0 z-50 px-4 pt-3 sm:hidden">
          <Link href={ctaHref} className="btn btn-primary h-13 w-full text-base">
            {ctaLabel}
          </Link>
        </div>
      )}
    </div>
  );
}
