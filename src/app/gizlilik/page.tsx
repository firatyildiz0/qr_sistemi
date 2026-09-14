import type { Metadata } from "next";
import YasalSayfa, {
  B,
  Bolum,
  Eposta,
  IcBaglanti,
  Liste,
  P,
  Sirket,
} from "@/components/yasal/YasalSayfa";
import { SIRKET } from "@/lib/yasal";

/**
 * Gizlilik politikası.
 *
 * Metin şablondan değil, şemadan yazıldı: burada sayılan her alan gerçekten
 * `supabase/schema.sql` içinde duran bir kolona karşılık geliyor ve sayılmayan
 * hiçbir şey toplanmıyor. Bir gizlilik metninin tek işi bu — ne toplandığını
 * doğru söylemek. Yeni bir alan eklendiğinde burası da (ve KVKK aydınlatma
 * metni de) güncellenmeli, yoksa metin sessizce yalan söylemeye başlar.
 *
 * Sayfa herkese açık ve oturum istemiyor: Meta uygulama incelemesi adresi
 * dışarıdan açabilmek zorunda, müşteri de rezervasyon yapmadan önce okuyabilmeli.
 * Adres de bu yüzden değişmiyor — Meta'ya verilen URL bu; `#veri-silme` çapası
 * Meta'nın veri silme talimatları alanına verildi.
 */

export const metadata: Metadata = {
  title: "Gizlilik Politikası — RentQR",
  description:
    "RentQR'ın hangi verileri topladığı, neden topladığı, ne kadar sakladığı ve nasıl sildirebileceğiniz.",
};

export default function GizlilikPage() {
  return (
    <YasalSayfa
      href="/gizlilik"
      baslik="Gizlilik Politikası"
      giris="Bu metin RentQR’ın hangi verileri topladığını, neden topladığını, ne kadar sakladığını ve nasıl sildirebileceğinizi anlatır."
    >
      <Bolum baslik="Kim işliyor?">
        <P>
          RentQR, <B>{SIRKET.marka}</B> (<Sirket alan="unvan" />) tarafından işletilen bir kiralama
          takip sistemidir. Her konuda <Eposta /> adresinden ulaşabilirsiniz. Kişisel verilerin
          hangi hukuki sebeple işlendiği ve başvuru yolları{" "}
          <IcBaglanti href="/kvkk">KVKK Aydınlatma Metni</IcBaglanti>’nde ayrıca yazılıdır.
        </P>
      </Bolum>

      <Bolum baslik="İki farklı kişi, iki farklı veri">
        <P>
          RentQR’ı kiralama yapan işletmeler (satıcılar) kullanır. Sistemde iki tür kişi var ve
          verileri birbirinden ayrı duruyor:
        </P>
        <Liste
          maddeler={[
            <>
              <B>Satıcı:</B> panelde hesabı olan, ürünlerini ve rezervasyonlarını yöneten işletme.
              Satıcının kendi verileri için veri sorumlusu Veyro Labs’tır.
            </>,
            <>
              <B>Müşteri:</B> bir ürünü kiralayan kişi. Müşterinin panelde hesabı yoktur;
              bilgilerini ya satıcı girer ya da müşteri Instagram üzerinden kendisi gönderir. Bu
              bilgiler için veri sorumlusu kiralama yapılan satıcıdır; Veyro Labs onları yalnızca
              satıcı adına ve sistemi çalıştırmak için işler.
            </>,
          ]}
        />
        <P>
          Bir satıcı yalnızca kendi ürünlerini, kendi rezervasyonlarını ve kendi müşterilerini
          görebilir. Bu, arayüzde saklamakla değil, veritabanı düzeyindeki erişim kurallarıyla
          sağlanır.
        </P>
      </Bolum>

      <Bolum baslik="Satıcıdan toplananlar">
        <Liste
          maddeler={[
            "Hesap bilgileri: e-posta adresi, kullanıcı adı ve şifre. Şifre bize hiçbir zaman okunabilir hâlde ulaşmaz; kimlik doğrulama sağlayıcımızda özetlenerek saklanır.",
            "Kayıt sırasında kabul edilen üyelik sözleşmesinin sürümü ve kabul zamanı.",
            "Katalog: ürün adı, açıklaması, özellikleri, günlük fiyatı, stok adedi, görselleri ve etiket numarası.",
            "İşletme ayarları: kargo ve hazırlık süreleri gibi kiralama takvimini etkileyen tercihler.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Müşteriden toplananlar">
        <P>Bir rezervasyon oluşturulduğunda şunlar kaydedilir:</P>
        <Liste
          maddeler={[
            "Ad soyad",
            "Telefon numarası (isteğe bağlı)",
            "İl, ilçe ve — girilmişse — açık adres",
            "Kiralama tarihleri ve varsa alınan teminat tutarı",
          ]}
        />
        <P>
          Bu bilgiler yalnızca kiralamanın yürütülmesi için kullanılır: ürünün teslim edilmesi,
          takvimde doğru günlerin kapatılması ve iade takibi. Pazarlama amacıyla kullanılmaz,
          satılmaz, reklam için üçüncü taraflarla paylaşılmaz.
        </P>
      </Bolum>

      <Bolum baslik="QR kodu okutan ziyaretçiler">
        <P>
          Bir ürünün QR kodu okutulduğunda satıcının kaç kez okutulduğunu görebilmesi için bir kayıt
          tutulur. Bu kayıtta <B>ham IP adresi saklanmaz</B>: IP ve tarayıcı bilgisi tuzlanmış tek
          yönlü bir özete çevrilir ve yalnızca aynı kişinin sayfayı yenilemesini tek okutma saymak
          için kullanılır. Özetten geriye kimliğe ulaşılamaz.
        </P>
        <P>
          Panelde görünen “şu an kaç kişi bakıyor” sayacı da aynı yöntemle çalışır ve yalnızca bir
          sayıdan ibarettir.
        </P>
      </Bolum>

      <Bolum baslik="Güvenlik kayıtları">
        <P>
          Başarısız giriş denemeleri, hız sınırına takılan istekler ve yetkisiz erişim denemeleri
          kaydedilir. Bu kayıtta denenen kullanıcı adı, IP adresi ve tarayıcı bilgisi bulunur — şifre{" "}
          <em>asla</em> kaydedilmez. Amaç yalnızca hesapları saldırıya karşı korumak ve bir olayın
          geriye dönük incelenebilmesidir. Müşteri bilgileri bu kayda hiç girmez.
        </P>
      </Bolum>

      <Bolum id="instagram" baslik="Instagram üzerinden rezervasyon">
        <P>
          Satıcı isterse Instagram işletme hesabını RentQR’a bağlayabilir. Bağlandığında, hesabına
          mesaj yazan müşteriler rezervasyon talebi oluşturabilir. Bu durumda:
        </P>
        <Liste
          maddeler={[
            "Müşterinin Instagram kullanıcı kimliği, sohbetin hangi adımda olduğu ve talebi tamamlamak için yazdığı bilgiler (ürün kodu, tarihler, ad, telefon, il/ilçe) saklanır.",
            "Sohbetin tamamı saklanmaz; yalnızca rezervasyon talebini oluşturmak için gereken alanlar tutulur.",
            "Aynı mesajın iki kez işlenmesini önlemek için mesaj kimlikleri 7 gün boyunca tutulur ve sonra silinir.",
            "Satıcı adına mesaj gönderebilmek için Instagram’dan alınan erişim anahtarı sunucuda saklanır; tarayıcıya hiçbir zaman gönderilmez.",
          ]}
        />
        <P>
          Instagram’a giden tek şey müşteriye yazılan cevap mesajlarıdır. Instagram üzerindeki
          mesajlaşma ayrıca Meta’nın kendi gizlilik politikasına tabidir. Satıcı bağlantıyı panelden
          istediği an kesebilir; kestiğinde erişim anahtarı silinir.
        </P>
      </Bolum>

      <Bolum baslik="Ne kadar saklanıyor?">
        <Liste
          maddeler={[
            "Güvenlik kayıtları: 90 gün",
            "QR okutma kayıtları: 400 gün",
            "Instagram mesaj kimlikleri: 7 gün",
            "Anlık ziyaretçi kayıtları: 1 gün",
            "Rezervasyonlar, müşteri bilgileri ve katalog: satıcı silene kadar. Satıcı bir rezervasyonu sildiğinde kayıt tamamen kaldırılır, arşivlenmez.",
            "Ücretli abonelik başladığında fatura ve ödeme kayıtları: vergi mevzuatının öngördüğü süre (10 yıl).",
          ]}
        />
        <P>
          İlk dört kalem her gün çalışan otomatik bir bakım işiyle silinir; elle müdahale gerekmez.
        </P>
      </Bolum>

      <Bolum baslik="Kimlerle paylaşılıyor?">
        <P>
          Veriler satılmaz ve reklam amacıyla paylaşılmaz. Sistemin çalışması için yalnızca şu hizmet
          sağlayıcılar kullanılır:
        </P>
        <Liste
          maddeler={[
            <>
              <B>Supabase</B> — veritabanı ve kimlik doğrulama.
            </>,
            <>
              <B>Vercel</B> — uygulamanın barındırılması.
            </>,
            <>
              <B>Sentry</B> — yazılım hatalarının izlenmesi. IP adresi ve kişisel bilgi gönderilmeyecek,
              ekran kaydı alınmayacak şekilde yapılandırılmıştır.
            </>,
            <>
              <B>Meta (Instagram)</B> — yalnızca Instagram bağlantısı kuran satıcılar için,
              mesajlaşma.
            </>,
            <>
              <B>Resend</B> — yalnızca sistem yöneticisine gönderilen güvenlik uyarı e-postaları.
              Müşteri verisi içermez.
            </>,
          ]}
        />
        <P>
          Bu sağlayıcıların sunucuları yurt dışında bulunabilir. Bunun dışında veriler yalnızca yasal
          bir zorunluluk hâlinde yetkili makamlarla paylaşılır.
        </P>
      </Bolum>

      <Bolum baslik="Çerezler">
        <P>
          Reklam veya izleme çerezi kullanılmıyor. Yalnızca oturumun açık kalması için gereken kimlik
          doğrulama çerezleri ve tema/görünüm tercihiniz gibi ayarlar tarayıcınızda tutulur. Tam liste{" "}
          <IcBaglanti href="/cerez-politikasi">Çerez Politikası</IcBaglanti>’nda.
        </P>
      </Bolum>

      <Bolum id="veri-silme" baslik="Verilerinizi silme">
        <P>
          Verilerinizin silinmesini istiyorsanız yapmanız gereken şey kim olduğunuza göre değişir:
        </P>
        <Liste
          maddeler={[
            <>
              <B>Müşteriyseniz</B> (bir ürün kiraladınız ya da Instagram’dan talep gönderdiniz):
              kiralama yaptığınız işletmeye başvurun; kaydınızı panelinden silebilir. İşletmeye
              ulaşamıyorsanız <Eposta /> adresine yazın, kaydı bulup sileriz.
            </>,
            <>
              <B>Instagram sohbet verileriniz için:</B> aynı adrese Instagram kullanıcı adınızla
              birlikte yazmanız yeterli. Ayrıca{" "}
              <a
                href="https://www.instagram.com/accounts/manage_access/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-underline font-medium text-accent"
              >
                Instagram ayarlarınızdan
              </a>{" "}
              uygulamanın erişimini kaldırabilirsiniz.
            </>,
            <>
              <B>Satıcıysanız:</B> hesabınızın ve bağlı bütün verilerin silinmesi için{" "}
              {SIRKET.eposta} adresine yazın. Hesap silindiğinde ürünleriniz, rezervasyonlarınız ve
              Instagram bağlantınız da birlikte silinir.
            </>,
          ]}
        />
        <P>Silme talepleri en geç 30 gün içinde sonuçlandırılır ve size yazılı olarak bildirilir.</P>
      </Bolum>

      <Bolum baslik="Haklarınız">
        <P>
          6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında; hakkınızda veri işlenip
          işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, amacına uygun kullanılıp
          kullanılmadığını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini, şartları oluştuğunda
          silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz. Başvuru yolları{" "}
          <IcBaglanti href="/kvkk#basvuru">KVKK Aydınlatma Metni</IcBaglanti>’nde yazılıdır.
        </P>
      </Bolum>

      <Bolum baslik="Değişiklikler">
        <P>
          Bu metin sistem değiştikçe güncellenir. Üstteki “son güncelleme” tarihi her zaman
          yürürlükteki sürümü gösterir.
        </P>
      </Bolum>
    </YasalSayfa>
  );
}
