import type { Metadata } from "next";
import Link from "next/link";
import {
  BilgiTablosu,
  Bolum,
  EpostaLink,
  Liste,
  OdemedeDoldurulur,
  Paragraf,
  SaticiKunyesi,
  Vurgu,
  YasalSayfa,
} from "@/components/yasal/YasalSayfa";
import { ABONELIK, SATICI } from "@/lib/yasal";

/**
 * Mesafeli satış sözleşmesi.
 *
 * Hizmet yalnızca işletmelere satılıyor, ama metin bilerek tüketici
 * mevzuatına göre kuruldu: yanlışlıkla bir birey abone olduğunda da geçerli
 * kalsın diye. Bu yüzden:
 *
 * - Abonelik belirsiz süreli. "Bir aylık sözleşme, kendiliğinden yenilenir"
 *   kurgusu 6502 s. Kanun m.52/3 ile yasak.
 * - Fesih en geç 7 günde işlenir, kullanılmayan günler iade edilir
 *   (Abonelik Sözleşmeleri Yönetmeliği m.24-25; bu iki madde her tür
 *   aboneliğe uygulanıyor).
 * - Uyuşmazlık maddesi arabulucu şartını anıyor (Mesafeli Sözleşmeler
 *   Yönetmeliği m.5/1-k, 1/1/2026'dan beri).
 * - Abonelik Sözleşmeleri Yönetmeliği m.6'nın zorunlu içeriği (tarih, temerrüt,
 *   ayıplı hizmet hakları, fesih sonuçları) ayrı maddelerde.
 *
 * Alıcı ve sipariş alanları ödeme adımında doldurulur; bu sayfa boş şablonu
 * gösterir.
 */

export const metadata: Metadata = {
  title: `Mesafeli Satış Sözleşmesi — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliğinin satın alınmasına ilişkin mesafeli satış sözleşmesi.`,
};

const linkSinifi = "link-underline font-medium text-accent";

export default function MesafeliSatisPage() {
  return (
    <YasalSayfa
      baslik="Mesafeli Satış Sözleşmesi"
      guncelleme="8 Ekim 2026"
      giris={`Bu sözleşme, ${SATICI.urun} aboneliğinin internet üzerinden satın alınmasına ilişkin tarafların hak ve yükümlülüklerini düzenler. Alıcı bu sözleşmeyi üyelik sırasında kabul eder; abonelik ilişkisi ödeme adımında kurulur.`}
    >
      <Bolum baslik="1. Taraflar">
        <Paragraf>
          <Vurgu>Satıcı:</Vurgu>
        </Paragraf>
        <SaticiKunyesi />
        <Paragraf>
          <Vurgu>Alıcı:</Vurgu> {SATICI.urun} üzerinde hesap oluşturan ve aboneliği satın alan
          gerçek veya tüzel kişidir. Aşağıdaki bilgiler, Alıcı’nın ödeme adımında beyan ettiği
          bilgilerle doldurulur.
        </Paragraf>
        <BilgiTablosu
          satirlar={[
            ["Ad soyad / Unvan", <OdemedeDoldurulur key="ad" />],
            ["Vergi dairesi / No", <OdemedeDoldurulur key="vergi" />],
            ["Adres", <OdemedeDoldurulur key="adres" />],
            ["Telefon", <OdemedeDoldurulur key="tel" />],
            ["E-posta", <OdemedeDoldurulur key="eposta" />],
          ]}
        />
      </Bolum>

      <Bolum baslik="2. Tanımlar">
        <Liste
          maddeler={[
            <>
              <Vurgu>Kanun:</Vurgu> 6502 sayılı Tüketicinin Korunması Hakkında Kanun.
            </>,
            <>
              <Vurgu>Yönetmelik:</Vurgu> Mesafeli Sözleşmeler Yönetmeliği.
            </>,
            <>
              <Vurgu>Hizmet:</Vurgu> {SATICI.urun} kiralama takip sistemini abonelik süresince
              kullanma hakkı.
            </>,
            <>
              <Vurgu>Panel:</Vurgu> Alıcı’nın Hizmet’i kullandığı, hesabıyla giriş yaptığı web
              uygulaması.
            </>,
            <>
              <Vurgu>Abonelik dönemi:</Vurgu> Bedelin peşin ödendiği, ödeme tarihinden başlayan bir
              aylık süre.
            </>,
            <>
              <Vurgu>Kalıcı veri saklayıcısı:</Vurgu> Gönderilen bilginin değiştirilmeden
              saklanmasını ve aynen erişilmesini sağlayan e-posta gibi araçlar.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Sözleşmenin konusu">
        <Paragraf>
          Sözleşmenin konusu, Alıcı’nın Satıcı’ya ait internet sitesi üzerinden elektronik ortamda
          satın aldığı Hizmet’in satışı ve ifasına ilişkin olarak tarafların hak ve
          yükümlülüklerinin belirlenmesidir.
        </Paragraf>
        <Paragraf>
          Hizmet, kiralama yapan işletmelere yöneliktir. Alıcı, Hizmet’i ticari veya mesleki
          faaliyeti kapsamında satın aldığını beyan eder. Bu sözleşme, Alıcı’nın tüketici sayıldığı
          durumlarda da Kanun ve ilgili yönetmeliklere uygun olacak biçimde düzenlenmiştir; bu
          sözleşmede Alıcı’ya tanınan haklar hiçbir durumda bu mevzuatın tanıdığı haklardan az
          değildir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="4. Hizmet ve sipariş bilgileri">
        <Paragraf>
          Hizmet; ürün kataloğu, ürünlere özel baskıya hazır QR etiketleri, çakışmaları önleyen
          müsaitlik takvimi, rezervasyon, iade ve müşteri takibi özelliklerini kapsar.
        </Paragraf>
        <BilgiTablosu
          satirlar={[
            ["Hizmet", ABONELIK.ad],
            ["Sözleşme süresi", "Belirsiz süreli; asgari kullanım süresi yoktur"],
            ["Abonelik dönemi", "Bir ay; bedel her dönemin başında peşin alınır"],
            ["Dönem bedeli", `${ABONELIK.fiyat}, KDV dahil`],
            ["Ek masraf", "Yoktur; kargo veya teslimat ücreti alınmaz"],
            ["Sözleşme tarihi", <OdemedeDoldurulur key="tarih" />],
            ["Hizmetin başlama tarihi", <OdemedeDoldurulur key="baslama" />],
          ]}
        />
        <Paragraf>
          Ödeme adımında gösterilen toplam tutar, tüm vergiler dahil Alıcı’dan tahsil edilecek
          nihai tutardır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="5. Ödeme ve fatura">
        <Paragraf>
          Ödeme, kredi kartı veya banka kartı ile, lisanslı ödeme kuruluşu iyzico Ödeme Hizmetleri
          A.Ş. altyapısı üzerinden alınır. Kart bilgileri Satıcı’ya iletilmez ve Satıcı tarafından
          saklanmaz. Her abonelik döneminin bedeli, o dönemin başında Alıcı’nın ödeme adımında
          onayladığı karttan peşin olarak tahsil edilir.
        </Paragraf>
        <Paragraf>
          Fatura, Alıcı’nın ödeme adımında beyan ettiği bilgilerle Satıcı tarafından düzenlenir ve
          elektronik ortamda Alıcı’ya iletilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="6. Süre ve fiyat değişikliği">
        <Paragraf>
          Sözleşme belirsiz sürelidir ve Alıcı feshedene kadar devam eder. Asgari kullanım süresi
          veya taahhüt yoktur.
        </Paragraf>
        <Paragraf>
          Satıcı fiyatı değiştirmek isterse yeni fiyatı ve uygulanacağı tarihi en az 30 gün önce
          Alıcı’nın e-posta adresine bildirir. Yeni fiyat, bildirimden en az 30 gün sonra başlayan
          ilk abonelik döneminden itibaren uygulanır. Yeni fiyatı kabul etmeyen Alıcı, yeni fiyat
          uygulanmadan önce sözleşmeyi 9. maddeye göre feshedebilir; bu durumda kendisinden yeni
          fiyat üzerinden ücret alınmaz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="7. İfa (teslimat)">
        <Paragraf>
          Hizmet, ödemenin onaylanmasıyla birlikte Alıcı’nın hesabında anında etkinleştirilir ve
          ödeme onayı Alıcı’nın e-posta adresine bildirilir. Hizmet ödeme onayından itibaren 24
          saat içinde Satıcı’dan kaynaklanan bir nedenle etkinleştirilemezse Alıcı sözleşmeyi
          feshedebilir ve ödediği tutar kesintisiz iade edilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="8. Cayma hakkı">
        <Paragraf>
          Yönetmelik’in 15. maddesinin birinci fıkrasının (ğ) ve (h) bentleri uyarınca,{" "}
          <Vurgu>
            elektronik ortamda anında ifa edilen ve Alıcı’nın onayıyla cayma süresi dolmadan
            ifasına başlanan hizmetlerde
          </Vurgu>{" "}
          cayma hakkı kullanılamaz. Alıcı, ödeme adımında Hizmet’in hemen başlamasını açıkça talep
          eder ve bu nedenle cayma hakkının bulunmadığını bildiğini ayrıca onaylar.
        </Paragraf>
        <Paragraf>
          Cayma hakkının bulunmaması, Alıcı’nın sözleşmeyi istediği zaman feshetme ve kullanılmayan
          günlerin bedelini geri alma hakkını ortadan kaldırmaz.
        </Paragraf>
      </Bolum>

      <Bolum id="fesih" baslik="9. Fesih ve ücret iadesi">
        <Paragraf>
          Alıcı sözleşmeyi dilediği zaman, gerekçe göstermeden ve cezai şart ödemeden
          feshedebilir. Fesih bildirimi <EpostaLink /> adresine e-posta ile veya Satıcı’nın
          adresine yazılı olarak gönderilir; bildirimin bu yollardan biriyle yöneltilmesi
          yeterlidir. Hesaba kayıtlı olmayan bir adresten gelen bildirimde Satıcı, hesabın sahibini
          doğrulamak için kısa bir teyit isteyebilir.
        </Paragraf>
        <Paragraf>Alıcı fesih bildiriminde aşağıdaki iki seçenekten birini belirtebilir:</Paragraf>
        <Liste
          maddeler={[
            <>
              <Vurgu>Hemen sona erme:</Vurgu> Abonelik, bildirimin Satıcı’ya ulaşmasından itibaren
              en geç 7 gün içinde sona erdirilir. İçinde bulunulan dönemin kullanılmayan günlerine
              düşen bedel, sona erme tarihinden itibaren en geç 14 gün içinde kesintisiz iade
              edilir.
            </>,
            <>
              <Vurgu>Dönem sonunda sona erme:</Vurgu> Erişim, ödenmiş dönemin sonuna kadar devam
              eder ve bir sonraki dönem için ücret alınmaz. Dönemin tamamı kullanıldığından iade
              yapılmaz.
            </>,
          ]}
        />
        <Paragraf>
          Alıcı bir seçim belirtmezse hemen sona erme uygulanır. Kullanılmayan günlerin bedeli, dönem
          bedelinin dönemdeki toplam gün sayısına bölünüp kalan gün sayısıyla çarpılmasıyla
          hesaplanır.
        </Paragraf>
        <Paragraf>
          Satıcı, feshin gerçekleştiğini Alıcı’ya e-posta ile bildirir. Sona erme tarihinden sonra
          Alıcı’dan hiçbir ücret tahsil edilmez. Satıcı fesih talebini 7 gün içinde yerine
          getirmezse, bu sürenin bitiminden sonraki kullanım için de ücret istenmez.
        </Paragraf>
        <Paragraf>
          Satıcı, Alıcı’nın Hizmet’i hukuka aykırı amaçlarla kullandığını tespit ederse hesabı
          askıya alabilir ve sözleşmeyi yazılı bildirimle feshedebilir. Bu durumda da kullanılmayan
          günlerin bedeli iade edilir.
        </Paragraf>
        <Paragraf>
          Sözleşmenin sona ermesi, hesabın ve verilerin kendiliğinden silinmesi anlamına gelmez.
          Alıcı verilerinin silinmesini{" "}
          <Link href="/gizlilik" className={linkSinifi}>
            gizlilik metninde
          </Link>{" "}
          açıklanan yolla her zaman isteyebilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="10. Ödemenin yapılmaması">
        <Paragraf>
          Bir abonelik döneminin bedeli tahsil edilemezse Alıcı e-posta ile bilgilendirilir. Ödeme
          yapılana kadar Hizmet askıya alınabilir. Askı süresince Alıcı’nın verileri silinmez, yeni
          ücret tahsil edilmez ve gecikme faizi veya ceza talep edilmez. Ödeme onaylandığında Hizmet
          yeniden açılır ve yeni abonelik dönemi ödeme tarihinden başlar.
        </Paragraf>
      </Bolum>

      <Bolum baslik="11. Hizmetin kesintisi, ayıplı ifa ve mücbir sebep">
        <Paragraf>
          Satıcı, Hizmet’i sözleşmede belirtilen nitelikte ve makul bir süreklilik içinde sunar;
          planlı bakım çalışmalarını mümkün olduğunca önceden duyurur.
        </Paragraf>
        <Paragraf>
          Hizmet sözleşmede belirtilen nitelikte sunulmazsa Alıcı, Kanun’un 15. maddesi uyarınca
          hizmetin yeniden görülmesi, ayıp oranında bedelden indirim veya sözleşmeden dönme
          haklarından birini seçebilir ve bununla birlikte genel hükümlere göre tazminat da talep
          edebilir. Hizmetin yeniden görülmesi talebi en geç 30 iş günü içinde yerine getirilir.
          Bedelden indirim veya sözleşmeden dönmede ilgili tutar derhal iade edilir.
        </Paragraf>
        <Paragraf>
          Doğal afet, salgın, savaş, genel enerji veya internet altyapısı kesintisi gibi Satıcı’nın
          kontrolü dışındaki olaylar mücbir sebep sayılır. Mücbir sebep nedeniyle Hizmet
          sunulamazsa Satıcı Alıcı’yı bilgilendirir. Hizmet’in sunulamadığı günlerin bedeli, Alıcı’nın
          tercihine göre iade edilir veya sonraki döneme eklenir. Mücbir sebep 30 günden uzun
          sürerse taraflardan her biri sözleşmeyi feshedebilir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="12. Tarafların diğer yükümlülükleri">
        <Liste
          maddeler={[
            "Alıcı, hesap bilgilerinin gizliliğinden ve hesabı üzerinden yapılan işlemlerden sorumludur.",
            "Alıcı, Hizmet’i hukuka aykırı amaçlarla kullanamaz.",
            "Alıcı, üyelik ve ödeme sırasında verdiği bilgilerin doğru olduğunu kabul eder ve değiştiğinde günceller.",
          ]}
        />
      </Bolum>

      <Bolum baslik="13. Kişisel veriler">
        <Paragraf>
          Alıcı’ya ait kişisel verilerin hangi amaçlarla işlendiği ve Alıcı’nın hakları{" "}
          <Link href="/gizlilik" className={linkSinifi}>
            gizlilik metninde
          </Link>{" "}
          açıklanmıştır. Satıcı bu verileri 6698 sayılı Kişisel Verilerin Korunması Kanunu’na uygun
          olarak işler.
        </Paragraf>
      </Bolum>

      <Bolum baslik="14. Uyuşmazlıkların çözümü">
        <Paragraf>
          Alıcı’nın tüketici sayıldığı durumlarda uyuşmazlıklar için, Ticaret Bakanlığı’nca her yıl
          ilan edilen parasal sınırlar dahilinde Alıcı’nın veya Satıcı’nın yerleşim yerindeki
          tüketici hakem heyetine başvurulabilir. Bu sınırları aşan uyuşmazlıklarda, Kanun’un 73/A
          maddesi uyarınca dava açılmadan önce arabulucuya başvurulması şartıyla tüketici
          mahkemesine başvurulabilir.
        </Paragraf>
        <Paragraf>
          Alıcı’nın tacir olması hâlinde Bursa Mahkemeleri ve İcra Daireleri yetkilidir. Konusu bir
          miktar paranın ödenmesi olan ticari uyuşmazlıklarda, 6102 sayılı Türk Ticaret Kanunu’nun
          5/A maddesi uyarınca dava açılmadan önce arabulucuya başvurulması zorunludur.
        </Paragraf>
      </Bolum>

      <Bolum baslik="15. Yürürlük, değişiklik ve saklama">
        <Paragraf>
          Alıcı bu sözleşmeyi üyelik sırasında elektronik ortamda kabul eder. Abonelik ilişkisi,
          Alıcı’nın ödeme adımında{" "}
          <Link href="/on-bilgilendirme-formu" className={linkSinifi}>
            Ön Bilgilendirme Formu
          </Link>
          ’nu ayrıca teyit edip ödemeyi tamamlamasıyla kurulur. Bu sözleşmenin ayrılmaz parçası olan{" "}
          <Link href="/teslimat-ve-iade" className={linkSinifi}>
            Teslimat ve İade Şartları
          </Link>{" "}
          da aynı anda yürürlüğe girer.
        </Paragraf>
        <Paragraf>
          Alıcı’nın bilgileriyle doldurulan sözleşme ve ön bilgilendirme formu, ödeme onayıyla
          birlikte Alıcı’nın e-posta adresine kalıcı veri saklayıcısı olarak gönderilir. Satıcı bu
          kayıtları yasal süre boyunca saklar.
        </Paragraf>
        <Paragraf>
          Satıcı bu sözleşmeyi değiştirirse değişikliği, yürürlüğe girmesinden en az 30 gün önce
          Alıcı’nın e-posta adresine bildirir. Değişikliği kabul etmeyen Alıcı, değişiklik yürürlüğe
          girmeden önce sözleşmeyi 9. maddeye göre feshedebilir. Bu sayfa her zaman yürürlükteki
          sürümü gösterir.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
