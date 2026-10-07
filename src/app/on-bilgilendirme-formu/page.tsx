import type { Metadata } from "next";
import Link from "next/link";
import {
  Bolum,
  EpostaLink,
  Liste,
  Paragraf,
  SaticiKunyesi,
  Vurgu,
  YasalSayfa,
} from "@/components/yasal/YasalSayfa";
import { ABONELIK, SATICI } from "@/lib/yasal";

/**
 * Ön bilgilendirme formu.
 *
 * Mesafeli Sözleşmeler Yönetmeliği'nin 5. maddesi, sözleşme kurulmadan önce
 * alıcıya hangi bilgilerin verilmesi gerektiğini sayıyor; bölümler o sırayı
 * izliyor. Ödeme adımında bu form, sözleşmeden önce gösterilip ayrıca
 * onaylatılmalı — sayfanın kendisi bunu sağlamaz.
 */

export const metadata: Metadata = {
  title: `Ön Bilgilendirme Formu — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliği satın alınmadan önce alıcıya verilmesi gereken bilgiler.`,
};

const linkSinifi = "link-underline font-medium text-accent";

export default function OnBilgilendirmePage() {
  return (
    <YasalSayfa
      baslik="Ön Bilgilendirme Formu"
      guncelleme="7 Ekim 2026"
      giris={`6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ${SATICI.urun} aboneliği satın alınmadan önce alıcının bilgilendirilmesi için hazırlanmıştır.`}
    >
      <Bolum baslik="1. Satıcı bilgileri">
        <SaticiKunyesi />
      </Bolum>

      <Bolum baslik="2. Hizmetin temel nitelikleri">
        <Liste
          maddeler={[
            <>
              <Vurgu>Hizmet:</Vurgu> {ABONELIK.ad}. Kiralama yapan işletmeler için, internet
              üzerinden sunulan QR kodlu kiralama takip sistemi.
            </>,
            "Kapsam: ürün kataloğu, ürünlere özel baskıya hazır QR etiketleri, çakışmaları önleyen müsaitlik takvimi, rezervasyon, iade ve müşteri takibi.",
            "Hizmet fiziksel bir ürün değildir; abonelik süresince panele erişim hakkı sağlar.",
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Fiyat ve ödeme">
        <Liste
          maddeler={[
            <>
              <Vurgu>Bedel:</Vurgu> Aylık {ABONELIK.fiyat}, tüm vergiler dahil. Ödeme adımında
              gösterilen toplam tutar, alıcıdan tahsil edilecek nihai tutardır.
            </>,
            "Kargo, teslimat veya başka bir ek masraf yoktur.",
            "Ödeme, kredi kartı veya banka kartı ile, lisanslı ödeme kuruluşu iyzico Ödeme Hizmetleri A.Ş. altyapısı üzerinden alınır. Kart bilgileri satıcıya iletilmez.",
            "Taksitli ödemelerde vade farkı uygulanıp uygulanmadığı ve toplam tutar ödeme adımında ayrıca gösterilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Sözleşmenin süresi ve yenilenmesi">
        <Paragraf>
          Abonelik bir aylık dönem için kurulur ve iptal edilmediği sürece her dönem sonunda aynı
          ödeme aracından {ABONELIK.fiyat} tahsil edilerek kendiliğinden yenilenir. Asgari bir
          taahhüt süresi yoktur. Alıcı aboneliğini dilediği zaman iptal edebilir; iptal, içinde
          bulunulan dönemin sonunda geçerli olur ve sonraki dönem için ücret alınmaz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="5. İfa (teslimat)">
        <Paragraf>
          Hizmet, ödemenin iyzico tarafından onaylanmasıyla birlikte alıcının hesabında anında
          etkinleştirilir. Ödeme onayı alıcının kayıtlı e-posta adresine bildirilir. Teknik bir
          sorun nedeniyle hizmet 24 saat içinde etkinleşmezse ödeme eksiksiz iade edilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="6. Cayma hakkı">
        <Paragraf>
          Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesinin birinci fıkrasının (ğ) bendi
          uyarınca, <Vurgu>elektronik ortamda anında ifa edilen hizmetlere ilişkin sözleşmelerde
          cayma hakkı bulunmamaktadır</Vurgu>. {SATICI.urun} aboneliği ödeme onayıyla birlikte
          anında başladığından, alıcı bu sözleşmede cayma hakkını kullanamaz.
        </Paragraf>
        <Paragraf>
          Bu durum, alıcının aboneliği istediği zaman iptal etme hakkını ortadan kaldırmaz (bkz.
          madde 4). Hatalı veya mükerrer tahsilatlarda ücret, en geç 14 gün içinde ödemenin
          yapıldığı karta iade edilir. Ayrıntılar{" "}
          <Link href="/teslimat-ve-iade" className={linkSinifi}>
            Teslimat ve İade Şartları
          </Link>{" "}
          sayfasındadır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="7. Teknik gereksinimler">
        <Liste
          maddeler={[
            "Hizmet bir web uygulamasıdır; kurulum gerektirmez. Güncel sürümlü bir internet tarayıcısı (Chrome, Safari, Edge, Firefox) ve internet bağlantısı yeterlidir.",
            "Bilgisayar, tablet ve akıllı telefonlarda çalışır. QR kodları müşteriler tarafından telefonun kamerasıyla, ayrı bir uygulama olmadan okutulabilir.",
            "Hizmete erişim, alıcının hesabına bağlı kullanıcı adı ve şifre ile sağlanır; bunun dışında bir teknik koruma önlemi kullanımı kısıtlamaz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="8. Şikâyet ve itirazlar">
        <Paragraf>
          Şikâyet ve talepler için <EpostaLink /> adresine yazabilir veya {SATICI.telefon}{" "}
          numarasından satıcıya ulaşabilirsiniz. Uyuşmazlık hâlinde, Ticaret Bakanlığı’nca her yıl
          ilan edilen parasal sınırlar dahilinde alıcının veya satıcının yerleşim yerindeki
          Tüketici Hakem Heyetleri’ne, bu sınırları aşan durumlarda Tüketici Mahkemeleri’ne
          başvurulabilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="9. Onay">
        <Paragraf>
          Alıcı, ödeme adımında bu formu ve{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className={linkSinifi}>
            Mesafeli Satış Sözleşmesi
          </Link>
          ’ni okuduğunu, hizmetin ödeme onayıyla birlikte anında başlayacağını ve bu nedenle cayma
          hakkının bulunmadığını bildiğini elektronik ortamda onaylar. Formun bir örneği alıcının
          e-posta adresine gönderilir ve bu sayfada her zaman erişilebilir durumdadır.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
