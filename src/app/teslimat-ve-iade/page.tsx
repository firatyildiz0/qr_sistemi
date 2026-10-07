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

export const metadata: Metadata = {
  title: `Teslimat ve İade Şartları — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliğinin nasıl teslim edildiği, nasıl iptal edildiği ve hangi durumlarda ücret iadesi yapıldığı.`,
};

export default function TeslimatVeIadePage() {
  return (
    <YasalSayfa
      baslik="Teslimat ve İade Şartları"
      guncelleme="7 Ekim 2026"
      giris={`${SATICI.urun} aboneliğinin nasıl teslim edildiğini, nasıl iptal edileceğini ve hangi durumlarda ücret iadesi yapıldığını anlatır.`}
    >
      <Bolum baslik="Hizmetin niteliği">
        <Paragraf>
          {SATICI.urun}, internet üzerinden sunulan bir yazılım hizmetidir (
          {ABONELIK.donem} abonelik, {ABONELIK.fiyat}). Satın alınan şey fiziksel bir ürün değil,
          abonelik süresince {SATICI.urun} paneline erişim hakkıdır. Bu nedenle kargo, gönderim
          ücreti veya fiziksel teslimat söz konusu değildir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Teslimat">
        <Liste
          maddeler={[
            "Ödemeniz iyzico tarafından onaylandığı anda aboneliğiniz etkinleşir ve hesabınızla panele hemen erişebilirsiniz.",
            "Ödeme onayı ve abonelik bilgileri, hesabınıza kayıtlı e-posta adresine gönderilir.",
            "Teknik bir sorun nedeniyle aboneliğiniz ödemeden sonra 24 saat içinde etkinleşmezse bize yazın; sorun giderilir ya da ödemeniz eksiksiz iade edilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Abonelik süresi ve yenileme">
        <Paragraf>
          Abonelik, ödeme tarihinden itibaren bir aylık dönem için geçerlidir ve iptal edilmediği
          sürece her dönem sonunda aynı ödeme aracından {ABONELIK.fiyat} tahsil edilerek yenilenir.
          Fiyatta bir değişiklik olursa, yeni fiyat uygulanmadan önce e-posta ile bildirilir; yeni
          fiyatı kabul etmezseniz aboneliğinizi iptal edebilirsiniz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="İptal">
        <Liste
          maddeler={[
            <>
              Aboneliğinizi dilediğiniz zaman, gerekçe göstermeden iptal edebilirsiniz. İptal için{" "}
              <EpostaLink /> adresine hesabınıza kayıtlı e-posta adresinden yazmanız ya da{" "}
              {SATICI.telefon} numarasından bize ulaşmanız yeterlidir.
            </>,
            "İptal, içinde bulunulan dönemin sonunda geçerli olur. Ödemesi yapılmış dönemin sonuna kadar panele erişiminiz devam eder ve bir sonraki dönem için ücret alınmaz.",
            "İptal talebiniz alındığında size yazılı olarak onay verilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Cayma hakkı">
        <Paragraf>
          Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesinin (ğ) bendi uyarınca,{" "}
          <Vurgu>elektronik ortamda anında ifa edilen hizmetlerde</Vurgu> cayma hakkı
          kullanılamaz. {SATICI.urun} aboneliği ödeme onayıyla birlikte anında başladığından,
          satın alma sırasında bu durum size açıkça bildirilir ve onayınız alınır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Ücret iadesi yapılan durumlar">
        <Liste
          maddeler={[
            "Ödeme alındığı hâlde aboneliğin bizden kaynaklanan bir nedenle etkinleştirilememesi",
            "Aynı dönem için birden fazla kez ücret tahsil edilmesi",
            "İptal talebinden sonra yeni bir dönem için hatalı tahsilat yapılması",
          ]}
        />
        <Paragraf>
          Yukarıdakiler dışında, kullanılmaya başlanmış bir abonelik dönemi için kısmi ya da tam
          iade yapılmaz; iptal dönem sonunda geçerli olur.
        </Paragraf>
      </Bolum>

      <Bolum baslik="İade nasıl yapılır?">
        <Paragraf>
          Onaylanan iadeler, en geç <Vurgu>14 gün içinde</Vurgu> ödemenin yapıldığı kredi kartına
          veya banka kartına, iyzico aracılığıyla yapılır. Tutarın hesabınıza yansıma süresi
          bankanıza göre değişebilir. Taksitli ödemelerde iade, bankanızın uygulamasına göre
          taksitler hâlinde yansıtılabilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Uyuşmazlıklar">
        <Paragraf>
          Bu şartlar,{" "}
          <Link href="/mesafeli-satis-sozlesmesi" className="link-underline font-medium text-accent">
            Mesafeli Satış Sözleşmesi
          </Link>
          ’nin ayrılmaz bir parçasıdır. Uyuşmazlık hâlinde Ticaret Bakanlığı’nca her yıl belirlenen
          parasal sınırlar dahilinde Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici
          Mahkemeleri yetkilidir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Satıcı bilgileri">
        <SaticiKunyesi />
      </Bolum>
    </YasalSayfa>
  );
}
