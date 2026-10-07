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
  title: `Mesafeli Satış Sözleşmesi — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliğinin satın alınmasına ilişkin mesafeli satış sözleşmesi.`,
};

const linkSinifi = "link-underline font-medium text-accent";

export default function MesafeliSatisPage() {
  return (
    <YasalSayfa
      baslik="Mesafeli Satış Sözleşmesi"
      guncelleme="7 Ekim 2026"
      giris={`Bu sözleşme, ${SATICI.urun} aboneliğinin internet üzerinden satın alınmasına ilişkin tarafların hak ve yükümlülüklerini düzenler. Ödeme adımında elektronik ortamda onaylanarak kurulur.`}
    >
      <Bolum baslik="1. Taraflar">
        <Paragraf>
          <Vurgu>Satıcı:</Vurgu>
        </Paragraf>
        <SaticiKunyesi />
        <Paragraf>
          <Vurgu>Alıcı:</Vurgu> {SATICI.urun} üzerinde hesap oluşturarak aboneliği satın alan
          gerçek veya tüzel kişidir. Alıcının adı/unvanı, adresi, e-posta adresi ve telefonu, satın
          alma sırasında beyan ettiği bilgilerdir ve sözleşmenin ödeme adımında onaylanan
          sürümünde yer alır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="2. Sözleşmenin konusu">
        <Paragraf>
          Sözleşmenin konusu, Alıcı’nın Satıcı’ya ait internet sitesi üzerinden elektronik ortamda
          satın aldığı aşağıdaki dijital hizmetin satışı ve ifasına ilişkin olarak 6502 sayılı
          Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri
          gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="3. Hizmet bilgileri">
        <Liste
          maddeler={[
            <>
              <Vurgu>Hizmet:</Vurgu> {ABONELIK.ad} — QR kodlu kiralama takip sistemi panelini
              kullanım hakkı (ürün kataloğu, QR etiketleri, müsaitlik takvimi, rezervasyon ve
              müşteri takibi, Instagram üzerinden rezervasyon talebi).
            </>,
            <>
              <Vurgu>Süre:</Vurgu> Bir aylık dönem; iptal edilmediği sürece her dönem sonunda
              kendiliğinden yenilenir.
            </>,
            <>
              <Vurgu>Bedel:</Vurgu> Aylık {ABONELIK.fiyat}. Ödeme adımında gösterilen toplam tutar,
              tüm vergiler dahil Alıcı’dan tahsil edilecek nihai tutardır.
            </>,
            <>
              <Vurgu>Ek masraf:</Vurgu> Hizmet dijital olarak sunulduğundan kargo veya teslimat
              ücreti yoktur.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Ödeme">
        <Paragraf>
          Ödeme, kredi kartı veya banka kartı ile, lisanslı ödeme kuruluşu iyzico Ödeme Hizmetleri
          A.Ş. altyapısı üzerinden alınır. Kart bilgileri Satıcı’ya iletilmez ve Satıcı tarafından
          saklanmaz. Yenileme dönemlerinde bedel, Alıcı’nın onayladığı aynı ödeme aracından
          tahsil edilir. Tahsilatın gerçekleşmemesi hâlinde Satıcı, ödeme yapılana kadar hizmeti
          askıya alma hakkına sahiptir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="5. İfa (teslimat)">
        <Paragraf>
          Hizmet, ödemenin onaylanmasıyla birlikte Alıcı’nın hesabında anında etkinleştirilir ve
          ödeme onayı Alıcı’nın kayıtlı e-posta adresine bildirilir. Ayrıntılar{" "}
          <Link href="/teslimat-ve-iade" className={linkSinifi}>
            Teslimat ve İade Şartları
          </Link>{" "}
          sayfasında yer alır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="6. Cayma hakkı">
        <Paragraf>
          Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesinin birinci fıkrasının (ğ) bendi
          uyarınca, <Vurgu>elektronik ortamda anında ifa edilen hizmetlere</Vurgu> ilişkin
          sözleşmelerde cayma hakkı kullanılamaz. Alıcı, hizmetin ödeme onayıyla birlikte anında
          ifa edileceğini ve bu nedenle cayma hakkının bulunmadığını satın alma öncesinde
          bildiğini ve kabul ettiğini beyan eder.
        </Paragraf>
      </Bolum>

      <Bolum baslik="7. İptal ve ücret iadesi">
        <Paragraf>
          Alıcı aboneliğini dilediği zaman iptal edebilir; iptal, içinde bulunulan dönemin sonunda
          geçerli olur ve sonraki dönem için ücret tahsil edilmez. Hatalı veya mükerrer tahsilat
          ile hizmetin Satıcı’dan kaynaklanan bir nedenle etkinleştirilememesi hâllerinde ücret,
          en geç 14 gün içinde ödemenin yapıldığı karta iade edilir. İptal talepleri <EpostaLink />{" "}
          adresine iletilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="8. Tarafların yükümlülükleri">
        <Liste
          maddeler={[
            "Satıcı, hizmeti sözleşmede belirtilen nitelikte, makul bir süreklilik içinde sunmayı; planlı bakım çalışmalarını mümkün olduğunca önceden duyurmayı taahhüt eder.",
            "Satıcı, Alıcı’nın verilerini Gizlilik Sözleşmesi ve 6698 sayılı Kişisel Verilerin Korunması Kanunu’na uygun olarak işler.",
            "Alıcı, hesap bilgilerinin gizliliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.",
            "Alıcı, hizmeti hukuka aykırı amaçlarla kullanamaz; böyle bir kullanımın tespiti hâlinde Satıcı hesabı askıya alabilir.",
            "Alıcı, satın alma sırasında verdiği bilgilerin doğru olduğunu kabul eder.",
          ]}
        />
      </Bolum>

      <Bolum baslik="9. Kişisel veriler">
        <Paragraf>
          Alıcı’ya ait kişisel verilerin hangi amaçlarla işlendiği ve hakları{" "}
          <Link href="/gizlilik" className={linkSinifi}>
            Gizlilik Sözleşmesi
          </Link>{" "}
          sayfasında açıklanmıştır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="10. Uyuşmazlıkların çözümü">
        <Paragraf>
          Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı’nca her yıl ilan edilen parasal
          sınırlar dahilinde Alıcı’nın veya Satıcı’nın yerleşim yerindeki Tüketici Hakem Heyetleri,
          bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir. Alıcı’nın tacir olması
          hâlinde Bursa Mahkemeleri ve İcra Daireleri yetkilidir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="11. Yürürlük">
        <Paragraf>
          Alıcı, ödeme adımında bu sözleşmeyi ve{" "}
          <Link href="/teslimat-ve-iade" className={linkSinifi}>
            Teslimat ve İade Şartları
          </Link>
          ’nı okuduğunu ve kabul ettiğini elektronik ortamda onayladığı anda sözleşme kurulmuş
          sayılır. Sözleşmenin bir örneği Alıcı’nın e-posta adresine gönderilir ve bu sayfada her
          zaman erişilebilir durumdadır.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
