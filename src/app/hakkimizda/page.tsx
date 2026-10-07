import type { Metadata } from "next";
import Link from "next/link";
import {
  Bolum,
  Liste,
  Paragraf,
  SaticiKunyesi,
  Vurgu,
  YasalSayfa,
} from "@/components/yasal/YasalSayfa";
import { ABONELIK, SATICI } from "@/lib/yasal";

export const metadata: Metadata = {
  title: `Hakkımızda — ${SATICI.urun}`,
  description: `${SATICI.urun}, ${SATICI.marka} tarafından geliştirilen QR kodlu kiralama takip sistemidir.`,
};

export default function HakkimizdaPage() {
  return (
    <YasalSayfa
      baslik="Hakkımızda"
      guncelleme="7 Ekim 2026"
      giris={`${SATICI.urun}’ın kim tarafından, ne amaçla geliştirildiğini ve bize nasıl ulaşabileceğinizi anlatır.`}
    >
      <Bolum baslik="Biz kimiz?">
        <Paragraf>
          <Vurgu>{SATICI.marka}</Vurgu>, Bursa merkezli bir yazılım girişimidir. Küçük ve orta
          ölçekli işletmelerin günlük işini kolaylaştıran, telefondan rahatça kullanılabilen web
          uygulamaları geliştiriyoruz. {SATICI.urun} bu ürünlerin ilkidir.
        </Paragraf>
      </Bolum>

      <Bolum baslik={`${SATICI.urun} ne yapar?`}>
        <Paragraf>
          {SATICI.urun}, ekipman, kostüm, kamera, organizasyon malzemesi gibi ürünleri kiraya veren
          işletmeler için bir kiralama takip sistemidir. Her ürüne özel bir QR kod üretir; müşteri
          kodu telefonuyla okuttuğunda ürünün hangi günler müsait olduğunu görür ve rezervasyon
          talebi bırakır.
        </Paragraf>
        <Liste
          maddeler={[
            "Ürün kataloğu ve baskıya hazır QR etiketleri",
            "Çakışmaları önleyen canlı müsaitlik takvimi",
            "Rezervasyon, iade ve müşteri takibi",
          ]}
        />
      </Bolum>

      <Bolum baslik="Hizmet ve ücretlendirme">
        <Paragraf>
          {SATICI.urun}, internet üzerinden sunulan dijital bir hizmettir; fiziksel bir ürün
          gönderilmez. Hizmet <Vurgu>{ABONELIK.donem} {ABONELIK.fiyat}</Vurgu> abonelik bedeli
          karşılığında sunulur. Ödemeler, lisanslı ödeme kuruluşu <Vurgu>iyzico</Vurgu> altyapısı
          üzerinden kredi kartı veya banka kartı ile güvenle alınır. Ayrıntılar için{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className="link-underline font-medium text-accent">
            Mesafeli Satış Sözleşmesi
          </Link>{" "}
          ve{" "}
          <Link href="/teslimat-ve-iade" className="link-underline font-medium text-accent">
            Teslimat ve İade Şartları
          </Link>{" "}
          sayfalarına bakabilirsiniz.
        </Paragraf>
      </Bolum>

      <Bolum id="iletisim" baslik="İletişim ve işletme bilgileri">
        <Paragraf>
          Soru, öneri ve destek talepleriniz için bize aşağıdaki bilgilerden ulaşabilirsiniz. Hafta
          içi gönderilen e-postalara en geç bir iş günü içinde dönüş yapıyoruz.
        </Paragraf>
        <SaticiKunyesi />
      </Bolum>
    </YasalSayfa>
  );
}
