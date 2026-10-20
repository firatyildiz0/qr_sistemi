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
 * Teslimat ve iade şartları: mesafeli satış sözleşmesindeki kuralların sade
 * dille anlatımı. Buradaki her kural sözleşmede de var; ikisi ayrışırsa
 * ödeme kuruluşu incelemesinde de, bir uyuşmazlıkta da sorun çıkar.
 */

export const metadata: Metadata = {
  title: `Teslimat ve İade Şartları — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliğinin nasıl teslim edildiği, nasıl iptal edildiği ve hangi durumlarda ücret iadesi yapıldığı.`,
};

const linkSinifi = "link-underline font-medium text-accent";

export default function TeslimatVeIadePage() {
  return (
    <YasalSayfa
      baslik="Teslimat ve İade Şartları"
      guncelleme="8 Ekim 2026"
      giris={`${SATICI.urun} aboneliğinin nasıl teslim edildiğini, nasıl iptal edileceğini ve hangi durumlarda ücret iadesi yapıldığını anlatır.`}
    >
      <Bolum baslik="Hizmetin niteliği">
        <Paragraf>
          {SATICI.urun}, internet üzerinden sunulan bir yazılım hizmetidir ({ABONELIK.donem}{" "}
          {ABONELIK.fiyat}, KDV dahil). Satın alınan şey fiziksel bir ürün değil, abonelik süresince{" "}
          {SATICI.urun} paneline erişim hakkıdır. Bu nedenle kargo, gönderim ücreti veya fiziksel
          teslimat söz konusu değildir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Teslimat">
        <Liste
          maddeler={[
            "Ödemeniz iyzico tarafından onaylandığı anda aboneliğiniz etkinleşir ve hesabınızla panele hemen erişebilirsiniz.",
            "Ödeme onayı ve abonelik bilgileri, hesabınıza kayıtlı e-posta adresine gönderilir.",
            "Aboneliğiniz bizden kaynaklanan bir nedenle ödemeden sonra 24 saat içinde etkinleşmezse bize yazın; aboneliği iptal edip ödemenizin tamamını geri alabilirsiniz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Abonelik süresi ve ödeme">
        <Paragraf>
          Abonelik belirsiz sürelidir; siz iptal edene kadar devam eder. Asgari kullanım süresi veya
          taahhüt yoktur. Ücret her ay, dönemin başında, ilk ödemede onayladığınız karttan peşin
          alınır.
        </Paragraf>
        <Paragraf>
          Fiyatta bir değişiklik olursa yeni fiyat ve uygulanacağı tarih en az 30 gün önce e-posta ile
          bildirilir. Yeni fiyatı kabul etmezseniz, yeni fiyat uygulanmadan önce aboneliğinizi iptal
          edebilirsiniz; size yeni fiyat üzerinden ücret yansıtılmaz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="İptal">
        <Paragraf>
          Aboneliğinizi dilediğiniz zaman, gerekçe göstermeden ve ceza ödemeden iptal
          edebilirsiniz. İptal için <EpostaLink /> adresine e-posta göndermeniz yeterlidir. İptal
          ederken iki seçenekten birini belirtebilirsiniz:
        </Paragraf>
        <Liste
          maddeler={[
            <>
              <Vurgu>Hemen bitsin:</Vurgu> aboneliğiniz talebiniz bize ulaştıktan sonra en geç 7 gün
              içinde sona erer. Ödediğiniz dönemin kullanmadığınız günlerinin ücreti size iade edilir.
            </>,
            <>
              <Vurgu>Dönem sonunda bitsin:</Vurgu> ödediğiniz dönemin sonuna kadar panele erişiminiz
              devam eder ve bir sonraki dönem için ücret alınmaz. Dönemin tamamını kullandığınız için
              bu seçenekte iade yapılmaz.
            </>,
          ]}
        />
        <Paragraf>
          Seçim belirtmezseniz aboneliğiniz hemen sona erer ve kalan günlerin ücreti iade edilir.
          İptaliniz gerçekleştiğinde size e-posta ile yazılı onay gönderilir. Aboneliğin bitmesi
          verilerinizi silmez; silinmesini istediğinizde{" "}
          <Link href="/gizlilik#veri-silme" className={linkSinifi}>
            gizlilik metnindeki
          </Link>{" "}
          yolu izleyebilirsiniz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Cayma hakkı">
        <Paragraf>
          Satın aldığınız günden itibaren <Vurgu>14 gün içinde</Vurgu> hiçbir gerekçe göstermeden
          sözleşmeden cayabilirsiniz. Bunun için <EpostaLink /> adresine yazmanız yeterlidir.
        </Paragraf>
        <Paragraf>
          Aboneliği bu süre içinde kullanmış olsanız bile ödediğiniz ücretin tamamı, kesinti
          yapılmadan en geç 14 gün içinde iade edilir. Bu hak, işletme olarak satın aldığınızda da
          geçerlidir.
        </Paragraf>
        <Paragraf>
          14 gün geçtikten sonra da aboneliği istediğiniz zaman iptal edip kullanmadığınız günlerin
          ücretini geri alabilirsiniz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Ücret iadesi yapılan durumlar">
        <Liste
          maddeler={[
            "Satın aldığınız günden itibaren 14 gün içinde cayma hakkınızı kullandığınızda, ödediğiniz ücretin tamamı",
            "Aboneliği hemen bitecek şekilde iptal ettiğinizde, dönemin kullanılmayan günleri",
            "Ödeme alındığı hâlde aboneliğin bizden kaynaklanan bir nedenle etkinleştirilememesi",
            "Aynı dönem için birden fazla kez ücret tahsil edilmesi",
            "İptal talebinizden sonra yeni bir dönem için hatalı tahsilat yapılması",
            "Hizmetin sözleşmede belirtilen nitelikte sunulamaması veya mücbir sebeple kesintiye uğraması",
          ]}
        />
        <Paragraf>
          Kullanılmayan günlerin ücreti, dönem ücretinin dönemdeki gün sayısına bölünüp kalan gün
          sayısıyla çarpılmasıyla hesaplanır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="İade nasıl yapılır?">
        <Paragraf>
          İadeler en geç <Vurgu>14 gün içinde</Vurgu>, kesinti yapılmadan, ödemenin yapıldığı kredi
          kartına veya banka kartına iyzico aracılığıyla yapılır. Tutarın hesabınıza yansıma süresi
          bankanıza göre değişebilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Uyuşmazlıklar">
        <Paragraf>
          Bu şartlar,{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className={linkSinifi}>
            Mesafeli Satış Sözleşmesi
          </Link>
          ’nin ayrılmaz bir parçasıdır. Tüketici sayıldığınız durumlarda, Ticaret Bakanlığı’nca her
          yıl belirlenen parasal sınırlar dahilinde tüketici hakem heyetine başvurabilirsiniz. Bu
          sınırları aşan durumlarda, dava açmadan önce arabulucuya başvurmanız şartıyla tüketici
          mahkemesine gidebilirsiniz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Satıcı bilgileri">
        <SaticiKunyesi />
      </Bolum>
    </YasalSayfa>
  );
}
