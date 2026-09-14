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
import { UYELIK_SOZLESMESI_SURUMU } from "@/lib/yasal";

/**
 * Üyelik sözleşmesi. Üye ol formundaki zorunlu onay kutusu buraya bağlanıyor
 * ve kabul edilen sürüm (`UYELIK_SOZLESMESI_SURUMU`) hesaba yazılıyor.
 *
 * Hizmetin gerçek işleyişine göre yazıldı: hesaplar yönetici onayıyla açılıyor,
 * kiracının hesabı yok ve Veyro Labs kiralamaya taraf değil, ödeme almıyor.
 * Bunlardan biri değişirse ilgili madde de değişmeli.
 */

export const metadata: Metadata = {
  title: "Üyelik Sözleşmesi — RentQR",
  description: "RentQR satıcı hesabı açarken kabul edilen kullanım koşulları.",
};

export default function UyelikSozlesmesiPage() {
  return (
    <YasalSayfa
      href="/uyelik-sozlesmesi"
      baslik="Üyelik Sözleşmesi"
      giris={`Sürüm ${UYELIK_SOZLESMESI_SURUMU}. RentQR’a üye olarak bu sözleşmenin tamamını okuduğunuzu ve kabul ettiğinizi beyan edersiniz.`}
    >
      <Bolum baslik="1. Taraflar">
        <P>
          Bu sözleşme, bir tarafta aşağıda bilgileri bulunan <Sirket alan="unvan" /> (“Veyro Labs”)
          ile diğer tarafta RentQR’a üye olan gerçek veya tüzel kişi (“Üye”) arasında, Üye’nin
          üyelik formundaki onay kutusunu işaretleyerek kaydını tamamlaması ile elektronik ortamda
          kurulmuştur.
        </P>
        <SirketKunyesi />
      </Bolum>

      <Bolum baslik="2. Tanımlar">
        <Maddeler
          no={2}
          maddeler={[
            <>
              <B>Platform:</B> rentqr alan adı üzerinden sunulan RentQR web sitesi ve satıcı paneli.
            </>,
            <>
              <B>Hizmet:</B> Platform üzerinden sunulan ürün kataloğu, QR etiketi üretimi,
              müsaitlik takvimi, rezervasyon ve talep yönetimi, bildirimler ve entegrasyonlar.
            </>,
            <>
              <B>Üye:</B> Platform’a kaydolan ve hesabı Veyro Labs tarafından onaylanan, ürünlerini
              kiraya veren kişi veya işletme.
            </>,
            <>
              <B>Kiracı:</B> Üye’nin ürünlerini kiralayan ya da kiralamak için talepte bulunan kişi.
              Kiracının Platform’da hesabı yoktur.
            </>,
            <>
              <B>İçerik:</B> Üye’nin Platform’a yüklediği ürün adı, açıklaması, görselleri, fiyatları
              ve Kiracılara ait kayıtlar dahil her türlü bilgi.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="3. Sözleşmenin konusu">
        <P>
          Bu sözleşmenin konusu, Üye’nin Hizmet’ten yararlanmasına ilişkin şartların ve tarafların
          hak ve yükümlülüklerinin belirlenmesidir. Ücretli abonelik satın alınması hâlinde{" "}
          <IcBaglanti href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</IcBaglanti> ve{" "}
          <IcBaglanti href="/iptal-ve-iade">İptal ve İade Koşulları</IcBaglanti> da bu sözleşmenin
          ayrılmaz parçası olarak uygulanır.
        </P>
      </Bolum>

      <Bolum baslik="4. Üyelik ve hesap onayı">
        <Maddeler
          no={4}
          maddeler={[
            "Üye olabilmek için 18 yaşını doldurmuş ve fiil ehliyetine sahip olmak gerekir. Bir işletme adına üye olan kişi, o işletmeyi temsile yetkili olduğunu beyan eder.",
            "Üye, kayıt sırasında verdiği bilgilerin doğru ve güncel olduğunu kabul eder. Bilgiler değiştiğinde güncellenmesi Üye’nin sorumluluğundadır.",
            "Kayıt bir başvurudur. Hesap, Veyro Labs tarafından onaylandığında kullanıma açılır. Veyro Labs başvuruyu gerekçe göstermeksizin reddedebilir; onaydan önce Hizmet’e erişim yoktur.",
            "Hesap kişiye özeldir, başkasına devredilemez ve kullandırılamaz. Kullanıcı adı ve şifrenin gizliliğinden Üye sorumludur. Hesabın izinsiz kullanıldığını fark eden Üye bunu derhâl Veyro Labs’a bildirir.",
            "Hesap üzerinden yapılan tüm işlemler Üye tarafından yapılmış sayılır.",
          ]}
        />
      </Bolum>

      <Bolum baslik="5. Hizmetin kapsamı">
        <Maddeler
          no={5}
          maddeler={[
            "Veyro Labs, Üye’nin ürünlerini kataloglamasına, her ürün için QR etiketi oluşturmasına, müsaitlik takvimini ve rezervasyonlarını yönetmesine imkân veren bir yazılım hizmeti sunar.",
            "Veyro Labs Hizmet’i geliştirmek amacıyla özellik ekleyebilir, değiştirebilir veya kaldırabilir. Üye’nin kullandığı temel bir özelliğin kaldırılması makul bir süre önce bildirilir.",
            "Hizmet’in kesintisiz ve hatasız çalışması için makul özen gösterilir; ancak bakım, güncelleme, altyapı sağlayıcılarından veya mücbir sebeplerden kaynaklanan kesintiler olabilir. Hizmet “olduğu gibi” sunulur.",
            "Üye’nin kendi eylemiyle sildiği ürün, rezervasyon ve diğer kayıtlar kalıcı olarak silinir; Veyro Labs bunların geri getirilmesini taahhüt etmez.",
          ]}
        />
      </Bolum>

      <Bolum baslik="6. Üye’nin yükümlülükleri">
        <Maddeler
          no={6}
          maddeler={[
            "Üye, Hizmet’i yürürlükteki mevzuata, bu sözleşmeye ve genel ahlaka uygun olarak kullanır.",
            "Üye, kiralanması kanunen yasak olan veya izin, ruhsat gerektirdiği hâlde bunlara sahip olmadığı ürünleri Platform’a ekleyemez.",
            "Üye, yüklediği görsel ve metinler üzerinde gerekli haklara sahip olduğunu, bunların üçüncü kişilerin fikrî mülkiyet, kişilik veya diğer haklarını ihlal etmediğini kabul eder.",
            "Platform’un kaynak kodunu elde etmeye çalışmak, izinsiz güvenlik testi yapmak, otomatik araçlarla veri çekmek, başka üyelerin hesaplarına veya verilerine erişmeye çalışmak ve Hizmet’in işleyişini bozacak her türlü girişim yasaktır.",
            "QR etiketleri yalnızca ilgili ürün için kullanılır; Kiracıları yanıltacak şekilde kullanılamaz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="7. Kiralama ilişkisi">
        <Maddeler
          no={7}
          maddeler={[
            <>
              <B>Veyro Labs, Üye ile Kiracı arasındaki kiralama ilişkisine taraf değildir.</B>{" "}
              Kira bedeline aracılık etmez, Kiracıdan ödeme veya teminat almaz.
            </>,
            "Fiyatlandırma, teminat, teslim, hasar, gecikme, iade, iptal ve faturalandırma dahil kiralamadan doğan her türlü hak ve yükümlülük Üye ile Kiracı arasındadır. Üye, Kiracıya karşı kendi kiralama koşullarını belirlemek ve bildirmekle yükümlüdür.",
            "Kiracılardan gelen şikâyet ve talepler Üye’ye yöneltilir. Veyro Labs’a iletilen talepler ilgili Üye’ye aktarılır.",
          ]}
        />
      </Bolum>

      <Bolum baslik="8. Kişisel verilerin korunması">
        <Maddeler
          no={8}
          maddeler={[
            <>
              Üye’ye ait kişisel veriler{" "}
              <IcBaglanti href="/kvkk">KVKK Aydınlatma Metni</IcBaglanti> ve{" "}
              <IcBaglanti href="/gizlilik">Gizlilik Politikası</IcBaglanti> çerçevesinde işlenir.
            </>,
            <>
              Üye’nin Platform’a kaydettiği Kiracı verileri bakımından <B>veri sorumlusu Üye</B>,
              Veyro Labs ise <B>veri işleyendir</B>. Kiracıların aydınlatılması, gerekiyorsa açık
              rızalarının alınması ve başvurularının cevaplanması Üye’nin yükümlülüğündedir.
            </>,
            "Veyro Labs, Kiracı verilerini yalnızca Üye adına ve Hizmet’i sunmak amacıyla işler; başka bir amaçla kullanmaz, satmaz, üçüncü kişilerle paylaşmaz. Verilerin güvenliği için veritabanı düzeyinde erişim kuralları dahil gerekli teknik ve idari tedbirleri alır.",
            "Veyro Labs, Kiracı verilerini etkileyen bir veri ihlalinden haberdar olursa bunu gecikmeksizin Üye’ye bildirir.",
            "Üyelik sona erdiğinde Kiracı verileri Gizlilik Politikası’ndaki sürelere uygun olarak silinir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="9. Instagram entegrasyonu">
        <Maddeler
          no={9}
          maddeler={[
            "Üye isterse Instagram işletme hesabını Platform’a bağlayarak mesajla gelen rezervasyon taleplerini alabilir. Bu özelliğin kullanımı ayrıca Meta’nın kullanım koşullarına tabidir.",
            "Üye bağlantıyı panelden istediği an kesebilir. Meta’nın arayüzünde yapılan değişikliklerden veya kısıtlamalardan kaynaklanan kesintilerden Veyro Labs sorumlu değildir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="10. Ücretler">
        <Maddeler
          no={10}
          maddeler={[
            "Hizmet bu sözleşmenin yürürlüğe girdiği tarihte ücretsiz sunulmaktadır.",
            "Veyro Labs ileride ücretli abonelik planları sunabilir. Mevcut Üyeler, ücretli plana geçişten en az 30 gün önce e-posta ile bilgilendirilir. Ücretli planı kabul etmeyen Üye, varsa ücretsiz sunulmaya devam eden özelliklerle Hizmet’i kullanmayı sürdürebilir veya üyeliğini sona erdirebilir; bilgisi ve onayı olmadan ücret alınmaz.",
            <>
              Ücretli abonelikler{" "}
              <IcBaglanti href="/mesafeli-satis-sozlesmesi">Mesafeli Satış Sözleşmesi</IcBaglanti> ve{" "}
              <IcBaglanti href="/iptal-ve-iade">İptal ve İade Koşulları</IcBaglanti>’na tabidir.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="11. Fikrî mülkiyet">
        <Maddeler
          no={11}
          maddeler={[
            "Platform’un yazılımı, tasarımı, RentQR ve Veyro Labs adları ve logoları Veyro Labs’a aittir. Üye’ye yalnızca üyelik süresince, Hizmet’i bu sözleşmeye uygun kullanmak için sınırlı, devredilemez ve münhasır olmayan bir kullanım hakkı tanınır.",
            "İçerik’in hakları Üye’de kalır. Üye, Veyro Labs’a İçerik’i yalnızca Hizmet’i sunmak için gereken ölçüde (saklamak, işlemek, QR sayfasında Kiracılara göstermek) kullanma izni verir; bu izin üyelik sona erdiğinde sona erer.",
          ]}
        />
      </Bolum>

      <Bolum baslik="12. Sorumluluğun sınırı">
        <Maddeler
          no={12}
          maddeler={[
            "Veyro Labs; Üye ile Kiracı arasındaki kiralamadan, Üye’nin İçerik’inden ve Üye’nin bu sözleşmeye aykırı kullanımından doğan zararlardan sorumlu değildir.",
            "Veyro Labs’ın dolaylı zararlar ile kâr kaybından sorumluluğu yoktur. Ücretli abonelikte Veyro Labs’ın toplam sorumluluğu, zararın doğduğu tarihten önceki 12 ayda Üye’nin ödediği abonelik bedeliyle sınırlıdır.",
            "Bu sınırlamalar Veyro Labs’ın kastı veya ağır ihmali hâlinde ve tüketicilerin kanundan doğan haklarını ortadan kaldıracak şekilde uygulanmaz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="13. Askıya alma ve fesih">
        <Maddeler
          no={13}
          maddeler={[
            <>
              Üye, üyeliğini dilediği zaman <Sirket alan="eposta" /> adresine yazarak sona
              erdirebilir.
            </>,
            "Üye’nin bu sözleşmeye aykırı davranması hâlinde Veyro Labs, ihlalin giderilmesi için 7 günlük süre verir; süre sonunda ihlal devam ederse hesabı askıya alabilir veya sözleşmeyi feshedebilir. Hukuka aykırı kullanım, güvenlik ihlali veya üçüncü kişilere zarar verme gibi ağır hâllerde hesap bildirimsiz ve derhâl askıya alınabilir.",
            <>
              Sözleşme sona erdiğinde hesap ve buna bağlı ürün, rezervasyon ve Kiracı kayıtları en geç
              30 gün içinde silinir. Kanunen saklanması zorunlu kayıtlar bu sürenin dışındadır.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="14. Sözleşmede değişiklik">
        <P>
          Veyro Labs bu sözleşmeyi değiştirebilir. Esaslı değişiklikler yürürlüğe girmeden en az 15
          gün önce Üye’nin kayıtlı e-posta adresine bildirilir. Değişikliği kabul etmeyen Üye bu süre
          içinde üyeliğini sona erdirebilir; yürürlük tarihinden sonra Hizmet’i kullanmaya devam etmesi
          değişikliği kabul ettiği anlamına gelir.
        </P>
      </Bolum>

      <Bolum baslik="15. Bildirimler ve delil sözleşmesi">
        <P>
          Taraflar arasındaki bildirimler Üye’nin kayıtlı e-posta adresi ve Veyro Labs’ın{" "}
          <Sirket alan="eposta" /> adresi üzerinden yapılır. Taraflar, bu sözleşmeden doğacak
          uyuşmazlıklarda Veyro Labs’ın sunucu, veritabanı ve e-posta kayıtlarının 6100 sayılı Hukuk
          Muhakemeleri Kanunu’nun 193. maddesi uyarınca delil teşkil edeceğini kabul eder.
        </P>
      </Bolum>

      <Bolum baslik="16. Uygulanacak hukuk ve yetki">
        <P>
          Bu sözleşme Türkiye Cumhuriyeti hukukuna tabidir. Üye’nin tüketici olduğu hâllerde
          uyuşmazlıklarda Ticaret Bakanlığınca belirlenen parasal sınırlar dahilinde tüketici hakem
          heyetleri, bu sınırları aşan uyuşmazlıklarda tüketici mahkemeleri yetkilidir. Diğer
          hâllerde <Sirket alan="yetkiliIl" /> mahkemeleri ve icra daireleri yetkilidir.
        </P>
      </Bolum>

      <Bolum baslik="17. Yürürlük">
        <P>
          Bu sözleşme 17 maddeden oluşur ve Üye’nin kayıt formunda sözleşmeyi kabul ederek
          kaydını tamamladığı anda yürürlüğe girer. Kabul edilen sözleşmenin sürümü ve kabul tarihi
          hesap kayıtlarında saklanır.
        </P>
      </Bolum>
    </YasalSayfa>
  );
}
