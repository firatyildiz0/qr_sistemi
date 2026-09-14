import type { Metadata } from "next";
import YasalSayfa, {
  B,
  Bolum,
  IcBaglanti,
  Maddeler,
  P,
  Sirket,
  SirketKunyesi,
} from "@/components/yasal/YasalSayfa";

/**
 * Mesafeli satış sözleşmesi ve ön bilgilendirme (6502 sayılı Kanun ve
 * Mesafeli Sözleşmeler Yönetmeliği).
 *
 * Yalnızca Veyro Labs ile satıcı arasındaki abonelik satışını kapsıyor.
 * Satıcı ile kiracı arasındaki kiralama bu sözleşmenin konusu değil — Veyro
 * Labs o işleme taraf değil (bkz. Üyelik Sözleşmesi madde 7).
 *
 * Ödeme henüz yok. Satın alma akışı kurulduğunda bu metin ödeme adımında
 * gösterilmeli ve kabul edilmeli; kabul edilen metnin bir kopyası alıcıya
 * e-postayla gitmeli (madde 11).
 */

export const metadata: Metadata = {
  title: "Mesafeli Satış Sözleşmesi — RentQR",
  description: "RentQR ücretli aboneliği satın alındığında geçerli olan mesafeli satış sözleşmesi ve ön bilgilendirme.",
};

export default function MesafeliSatisPage() {
  return (
    <YasalSayfa
      href="/mesafeli-satis-sozlesmesi"
      baslik="Mesafeli Satış Sözleşmesi"
      giris="Bu sözleşme RentQR’ın ücretli aboneliği satın alındığında uygulanır ve aynı zamanda ön bilgilendirme formu niteliğindedir."
    >
      <div className="card border-accent/30 bg-accent-soft/40 text-sm text-ink">
        RentQR şu anda ücretsiz olarak sunulmaktadır ve herhangi bir ödeme alınmamaktadır. Aşağıdaki
        koşullar, ücretli abonelik planları kullanıma açıldığında satın alma işlemlerine uygulanır.
      </div>

      <Bolum baslik="1. Taraflar">
        <P>
          <B>Satıcı (hizmet sağlayıcı):</B>
        </P>
        <SirketKunyesi />
        <P>
          <B>Alıcı:</B> RentQR’da üyeliği bulunan ve abonelik satın alan gerçek veya tüzel kişi.
          Alıcının adı soyadı veya unvanı, fatura adresi, T.C. kimlik veya vergi numarası ve e-posta
          adresi satın alma sırasında girdiği bilgilerdir.
        </P>
      </Bolum>

      <Bolum baslik="2. Sözleşmenin konusu ve kapsamı">
        <Maddeler
          no={2}
          maddeler={[
            "Bu sözleşmenin konusu, Alıcı’nın RentQR platformu üzerinden elektronik ortamda satın aldığı abonelik hizmetinin satışı ve ifasına ilişkin tarafların hak ve yükümlülüklerinin belirlenmesidir.",
            "Alıcı’nın tüketici olduğu hâllerde 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uygulanır. Alıcı’nın ticari veya mesleki amaçla hareket ettiği hâllerde tüketici mevzuatına özgü hükümler uygulanmaz; bu sözleşme, Üyelik Sözleşmesi ile Türk Borçlar Kanunu ve Türk Ticaret Kanunu hükümleri uygulanır.",
            <>
              <IcBaglanti href="/uyelik-sozlesmesi">Üyelik Sözleşmesi</IcBaglanti> ve{" "}
              <IcBaglanti href="/iptal-ve-iade">İptal ve İade Koşulları</IcBaglanti> bu sözleşmenin
              ayrılmaz parçasıdır.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Hizmetin temel nitelikleri">
        <Maddeler
          no={3}
          maddeler={[
            "Satın alınan hizmet, RentQR satıcı panelinin seçilen plana ait özelliklerini abonelik süresince kullanma hakkıdır. Planın adı, kapsamı, süresi (aylık veya yıllık) ve özellikleri satın alma adımındaki sipariş özetinde gösterilir.",
            "Hizmet internet üzerinden sunulan bir yazılım hizmetidir; fiziksel bir ürün teslimatı yoktur.",
          ]}
        />
      </Bolum>

      <Bolum baslik="4. Fiyat ve ödeme">
        <Maddeler
          no={4}
          maddeler={[
            "Hizmetin tüm vergiler dahil toplam bedeli ve varsa dönemsel olarak tekrarlanacak ücret, onay adımından önce sipariş özetinde Türk lirası olarak gösterilir. Ek bir masraf alınmaz.",
            <>
              Ödeme kredi kartı veya banka kartı ile, 6493 sayılı Kanun kapsamında lisanslı ödeme
              kuruluşu <Sirket alan="odemeKurulusu" /> aracılığıyla alınır. Kart bilgileri Satıcı’ya
              ulaşmaz ve Satıcı tarafından saklanmaz.
            </>,
            "Ödemeye ilişkin fatura, Alıcı’nın girdiği fatura bilgilerine göre düzenlenir ve elektronik ortamda Alıcı’nın e-posta adresine gönderilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="5. Abonelik süresi ve otomatik yenileme">
        <Maddeler
          no={5}
          maddeler={[
            "Abonelik, ödemenin onaylandığı tarihte başlar ve seçilen dönem (bir ay veya bir yıl) sonunda, Alıcı iptal etmediği sürece aynı süre ve o tarihte geçerli fiyat üzerinden kendiliğinden yenilenir. Yenileme bedeli kayıtlı karttan tahsil edilir.",
            "Yıllık aboneliklerde Alıcı, yenileme tarihinden en az 7 gün önce e-posta ile bilgilendirilir.",
            "Alıcı otomatik yenilemeyi her zaman iptal edebilir; iptal, içinde bulunulan dönemin sonunda geçerli olur (bkz. İptal ve İade Koşulları).",
            "Yenileme bedeli tahsil edilemezse Alıcı bilgilendirilir ve ödeme bilgilerini güncellemesi için 7 gün süre tanınır. Bu süre sonunda ödeme yapılmazsa ücretli plana ait özellikler kapatılır; Alıcı’nın verileri Üyelik Sözleşmesi’ne göre korunmaya devam eder.",
          ]}
        />
      </Bolum>

      <Bolum baslik="6. Fiyat değişiklikleri">
        <P>
          Satıcı abonelik fiyatlarını değiştirebilir. Fiyat değişikliği, yürürlüğe girmeden en az 30
          gün önce Alıcı’ya e-posta ile bildirilir ve yalnızca bildirimden sonraki ilk yenileme
          döneminden itibaren uygulanır; içinde bulunulan dönemin bedeli değişmez. Yeni fiyatı kabul
          etmeyen Alıcı, yenilemeden önce aboneliğini iptal edebilir.
        </P>
      </Bolum>

      <Bolum baslik="7. Hizmetin ifası">
        <Maddeler
          no={7}
          maddeler={[
            "Hizmet, ödemenin onaylanmasının hemen ardından Alıcı’nın hesabında kullanıma açılır. Hizmetin ifa yeri elektronik ortamdır.",
            "Satıcı, hizmetin ifasının imkânsızlaştığını öğrenirse bunu öğrendiği tarihten itibaren 3 gün içinde Alıcı’ya bildirir ve tahsil edilen bedelin tamamını en geç 14 gün içinde iade eder.",
          ]}
        />
      </Bolum>

      <Bolum id="cayma" baslik="8. Cayma hakkı">
        <Maddeler
          no={8}
          maddeler={[
            <>
              Tüketici sıfatına sahip Alıcı, sözleşmenin kurulduğu tarihten itibaren <B>14 gün</B>{" "}
              içinde herhangi bir gerekçe göstermeksizin ve cezai şart ödemeksizin sözleşmeden
              cayma hakkına sahiptir.
            </>,
            <>
              Cayma bildirimi, süre içinde <Sirket alan="eposta" /> adresine e-posta göndererek veya{" "}
              <Sirket alan="adres" /> adresine yazılı olarak yapılabilir.
            </>,
            "Cayma bildiriminin Satıcı’ya ulaşmasından itibaren en geç 14 gün içinde tahsil edilen bedelin tamamı, ödemenin yapıldığı araçla ve Alıcı’ya herhangi bir masraf yüklenmeksizin iade edilir.",
            "Mesafeli Sözleşmeler Yönetmeliği’nin 15. maddesi, tüketicinin onayıyla ifasına başlanan hizmetlerde cayma hakkının kullanılamayacağını öngörmektedir. Satıcı bu istisnaya dayanmaz: Alıcı hizmeti kullanmaya başlamış olsa bile ilk abonelikte 14 günlük cayma hakkını kullanabilir.",
            <>
              Ticari veya mesleki amaçla hareket eden Alıcılara kanunen cayma hakkı tanınmamış olsa da
              Satıcı, aynı 14 günlük iade imkânını onlara da{" "}
              <IcBaglanti href="/iptal-ve-iade">İptal ve İade Koşulları</IcBaglanti> çerçevesinde
              sağlar.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="9. Alıcı’nın beyanları">
        <P>
          Alıcı, satın alma işleminden önce hizmetin temel nitelikleri, toplam bedeli, ödeme şekli,
          yenileme koşulları, cayma hakkı ve Satıcı’nın iletişim bilgileri hakkında bu metinle
          bilgilendirildiğini, bu ön bilgileri elektronik ortamda okuyup onayladığını kabul eder.
        </P>
      </Bolum>

      <Bolum baslik="10. Şikâyet ve uyuşmazlıklar">
        <Maddeler
          no={10}
          maddeler={[
            <>
              Talep ve şikâyetler için <Sirket alan="eposta" /> adresine veya <Sirket alan="telefon" />{" "}
              numarasına başvurulabilir.
            </>,
            "Tüketici Alıcılar; Ticaret Bakanlığınca her yıl belirlenen parasal sınırlar dahilinde yerleşim yerindeki veya işlemin yapıldığı yerdeki tüketici hakem heyetine, bu sınırları aşan uyuşmazlıklarda tüketici mahkemesine başvurabilir. Başvurular e-Devlet üzerinden Tüketici Bilgi Sistemi (TÜBİS) aracılığıyla da yapılabilir.",
            <>
              Tüketici olmayan Alıcılarla doğacak uyuşmazlıklarda <Sirket alan="yetkiliIl" />{" "}
              mahkemeleri ve icra daireleri yetkilidir.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="11. Yürürlük">
        <P>
          Bu sözleşme, Alıcı’nın satın alma adımında sözleşmeyi elektronik olarak onaylaması ve
          ödemenin tamamlanmasıyla kurulur. Sözleşmenin ve ön bilgilendirmenin bir kopyası Alıcı’nın
          e-posta adresine gönderilir; Satıcı bu kayıtları mevzuatın öngördüğü süre boyunca saklar.
        </P>
      </Bolum>
    </YasalSayfa>
  );
}
