import type { Metadata } from "next";
import Link from "next/link";
import {
  BilgiTablosu,
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
 * izliyor. 7. madde bu bilgilerin teyit edilmesini istiyor, teyit yoksa
 * sözleşme kurulmamış sayılıyor. "Onay" bölümündeki iki cümle ödeme
 * adımındaki iki ayrı kutunun metnidir; ödeme ekranı bunları birebir
 * kullanmalı, sayfanın kendisi teyidi sağlamaz.
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
      guncelleme="8 Ekim 2026"
      giris={`6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, ${SATICI.urun} aboneliği satın alınmadan önce alıcının bilgilendirilmesi için hazırlanmıştır. Hizmet işletmelere yöneliktir; form, alıcının tüketici sayıldığı durumlarda istenen bilgilerin tamamını içerir.`}
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
        <BilgiTablosu
          satirlar={[
            ["Hizmet", ABONELIK.ad],
            ["Dönem bedeli", `${ABONELIK.fiyat}, KDV dahil`],
            ["Ödeme sıklığı", "Her ay, dönemin başında peşin"],
            ["Ek masraf", "Yoktur; kargo veya teslimat ücreti alınmaz"],
          ]}
        />
        <Liste
          maddeler={[
            "Ödeme adımında gösterilen toplam tutar, tüm vergiler dahil alıcıdan tahsil edilecek nihai tutardır.",
            "Ödeme, kredi kartı veya banka kartı ile, lisanslı ödeme kuruluşu iyzico Ödeme Hizmetleri A.Ş. altyapısı üzerinden alınır. Kart bilgileri satıcıya iletilmez.",
            "Siparişin onaylanmasıyla alıcı ödeme yükümlülüğü altına girer.",
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Sözleşmenin süresi ve feshi">
        <Paragraf>
          Abonelik <Vurgu>belirsiz sürelidir</Vurgu>; asgari kullanım süresi veya taahhüt yoktur.
          Bedel aylık dönemler hâlinde, her dönemin başında aynı ödeme aracından peşin tahsil
          edilir.
        </Paragraf>
        <Paragraf>
          Alıcı sözleşmeyi dilediği zaman, gerekçe göstermeden ve cezai şart ödemeden, <EpostaLink />{" "}
          adresine e-posta göndererek veya satıcının adresine yazarak feshedebilir. Fesihte iki
          seçenek vardır:
        </Paragraf>
        <Liste
          maddeler={[
            <>
              <Vurgu>Hemen sona erme:</Vurgu> abonelik en geç 7 gün içinde sona erer ve kullanılmayan
              günlerin bedeli en geç 14 gün içinde iade edilir. Alıcı bir seçim belirtmezse bu
              seçenek uygulanır.
            </>,
            <>
              <Vurgu>Dönem sonunda sona erme:</Vurgu> erişim ödenmiş dönemin sonuna kadar sürer,
              sonraki dönem için ücret alınmaz.
            </>,
          ]}
        />
        <Paragraf>
          Fiyat değişiklikleri en az 30 gün önce e-posta ile bildirilir; yeni fiyatı kabul etmeyen
          alıcı, yeni fiyat uygulanmadan önce feshedebilir. Ayrıntılar{" "}
          <Link href="/mesafeli-satis-sozlesmesi#fesih" className={linkSinifi}>
            Mesafeli Satış Sözleşmesi
          </Link>
          ’ndedir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="5. İfa (teslimat)">
        <Paragraf>
          Hizmet, ödemenin iyzico tarafından onaylanmasıyla birlikte alıcının hesabında anında
          etkinleştirilir. Ödeme onayı alıcının kayıtlı e-posta adresine bildirilir. Hizmet ödeme
          onayından itibaren 24 saat içinde satıcıdan kaynaklanan bir nedenle etkinleşmezse ödeme
          eksiksiz iade edilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="6. Cayma hakkı">
        <Paragraf>
          Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesinin birinci fıkrasının (ğ) ve (h) bentleri
          uyarınca,{" "}
          <Vurgu>
            elektronik ortamda anında ifa edilen ve tüketicinin onayıyla cayma süresi dolmadan
            ifasına başlanan hizmetlerde cayma hakkı kullanılamaz
          </Vurgu>
          .
        </Paragraf>
        <Paragraf>
          {SATICI.urun} aboneliği, alıcının ödeme adımında hizmetin hemen başlamasını açıkça talep
          etmesi ve ödemenin onaylanmasıyla anında başlar. Alıcı bu talebi onayladığında cayma
          hakkını kaybeder; bu onay verilmeden abonelik başlatılamaz.
        </Paragraf>
        <Paragraf>
          Cayma hakkının bulunmaması, aboneliği istediği zaman feshetme ve kullanılmayan günlerin
          bedelini geri alma hakkını ortadan kaldırmaz (bkz. madde 4). Hatalı veya mükerrer
          tahsilatlar da en geç 14 gün içinde iade edilir; ayrıntılar{" "}
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

      <Bolum baslik="8. Şikâyet ve uyuşmazlıklar">
        <Paragraf>
          Şikâyet ve talepler için <EpostaLink /> adresine yazabilir veya {SATICI.telefon}{" "}
          numarasından satıcıya ulaşabilirsiniz.
        </Paragraf>
        <Paragraf>
          Alıcının tüketici sayıldığı durumlarda uyuşmazlıklar için, Ticaret Bakanlığı’nca her yıl
          ilan edilen parasal sınırlar dahilinde alıcının veya satıcının yerleşim yerindeki
          tüketici hakem heyetine başvurulabilir. Bu sınırları aşan uyuşmazlıklarda, 6502 sayılı
          Kanun’un 73/A maddesi uyarınca dava açılmadan önce arabulucuya başvurulması şartıyla
          tüketici mahkemesine başvurulabilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="9. Onay">
        <Paragraf>
          Ödeme adımında alıcıdan, ödeme düğmesine basmadan önce iki ayrı onay alınır:
        </Paragraf>
        <Liste
          maddeler={[
            "“Ön Bilgilendirme Formu’nu ve Mesafeli Satış Sözleşmesi’ni okudum ve onaylıyorum. Siparişi onayladığımda ödeme yükümlülüğü altına gireceğimi biliyorum.”",
            "“Hizmetin cayma süresi dolmadan hemen başlamasını istiyorum. Bu nedenle cayma hakkımın bulunmadığını biliyorum.”",
          ]}
        />
        <Paragraf>
          Bu form,{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className={linkSinifi}>
            Mesafeli Satış Sözleşmesi
          </Link>
          ’nin ayrılmaz parçasıdır. Alıcının bilgileriyle doldurulan formun bir örneği, ödeme
          onayıyla birlikte alıcının e-posta adresine gönderilir; form bu sayfada her zaman
          erişilebilir durumdadır.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
