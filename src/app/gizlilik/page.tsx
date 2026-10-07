import type { Metadata } from "next";
import {
  Bolum,
  EpostaLink,
  Liste,
  SaticiKunyesi,
  YasalSayfa,
} from "@/components/yasal/YasalSayfa";
import { SATICI } from "@/lib/yasal";

/**
 * Gizlilik politikası.
 *
 * Metin şablondan değil, şemadan yazıldı: burada sayılan her alan gerçekten
 * `supabase/schema.sql` içinde duran bir kolona karşılık geliyor ve sayılmayan
 * hiçbir şey toplanmıyor. Bir gizlilik metninin tek işi bu — ne toplandığını
 * doğru söylemek. Yeni bir alan eklendiğinde burası da güncellenmeli, yoksa
 * metin sessizce yalan söylemeye başlar.
 *
 * Sayfa herkese açık ve oturum istemiyor: ödeme kuruluşu incelemesi adresi
 * dışarıdan açabilmek zorunda, müşteri de rezervasyon yapmadan önce okuyabilmeli.
 */

export const metadata: Metadata = {
  title: "Gizlilik Sözleşmesi — RentQR",
  description:
    "RentQR'ın hangi verileri topladığı, neden topladığı, ne kadar sakladığı ve nasıl sildirebileceğiniz.",
};

const GUNCELLEME = "7 Ekim 2026";
const EPOSTA = SATICI.eposta;

export default function GizlilikPage() {
  return (
    <YasalSayfa
      baslik="Gizlilik Sözleşmesi"
      guncelleme={GUNCELLEME}
      giris="Bu metin RentQR’ın hangi verileri topladığını, neden topladığını, ne kadar sakladığını ve nasıl sildirebileceğinizi anlatır. 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamındaki aydınlatma metni yerine de geçer."
    >
        <Bolum baslik="Kim işliyor?">
          <p className="text-ink-muted">
            RentQR, <strong className="font-semibold text-ink">{SATICI.marka}</strong> tarafından
            işletilen bir kiralama takip sistemidir. Veri sorumlusu, {SATICI.marka} adıyla faaliyet
            gösteren şahıs işletmesi sahibi {SATICI.unvan}’dır. Her konuda <EpostaLink /> adresinden
            ulaşabilirsiniz.
          </p>
          <SaticiKunyesi />
        </Bolum>

        <Bolum baslik="İki farklı kişi, iki farklı veri">
          <p className="text-ink-muted">
            RentQR’ı kiralama yapan işletmeler (satıcılar) kullanır. Sistemde iki tür kişi var ve
            verileri birbirinden ayrı duruyor:
          </p>
          <Liste
            maddeler={[
              <>
                <strong className="font-semibold text-ink">Satıcı:</strong> panelde hesabı olan,
                ürünlerini ve rezervasyonlarını yöneten işletme.
              </>,
              <>
                <strong className="font-semibold text-ink">Müşteri:</strong> bir ürünü kiralayan
                kişi. Müşterinin panelde hesabı yoktur; bilgilerini satıcı girer.
              </>,
            ]}
          />
          <p className="text-ink-muted">
            Bir satıcı yalnızca kendi ürünlerini, kendi rezervasyonlarını ve kendi müşterilerini
            görebilir. Bu, arayüzde saklamakla değil, veritabanı düzeyindeki erişim kurallarıyla
            sağlanır.
          </p>
        </Bolum>

        <Bolum baslik="Satıcıdan toplananlar">
          <Liste
            maddeler={[
              "Hesap bilgileri: e-posta adresi, kullanıcı adı ve şifre. Şifre bize hiçbir zaman okunabilir hâlde ulaşmaz; kimlik doğrulama sağlayıcımızda özetlenerek saklanır.",
              "Katalog: ürün adı, açıklaması, özellikleri, günlük fiyatı, stok adedi, görselleri ve etiket numarası.",
              "İşletme ayarları: kargo ve hazırlık süreleri gibi kiralama takvimini etkileyen tercihler.",
            ]}
          />
        </Bolum>

        <Bolum baslik="Müşteriden toplananlar">
          <p className="text-ink-muted">
            Bir rezervasyon oluşturulduğunda şunlar kaydedilir:
          </p>
          <Liste
            maddeler={[
              "Ad soyad",
              "Telefon numarası (isteğe bağlı)",
              "İl, ilçe ve — girilmişse — açık adres",
              "Kiralama tarihleri ve varsa alınan teminat tutarı",
            ]}
          />
          <p className="text-ink-muted">
            Bu bilgiler yalnızca kiralamanın yürütülmesi için kullanılır: ürünün teslim edilmesi,
            takvimde doğru günlerin kapatılması ve iade takibi. Pazarlama amacıyla kullanılmaz,
            satılmaz, reklam için üçüncü taraflarla paylaşılmaz.
          </p>
        </Bolum>

        <Bolum id="odeme" baslik="Abonelik ödemeleri">
          <p className="text-ink-muted">
            Satıcıların abonelik ödemeleri lisanslı ödeme kuruluşu{" "}
            <strong className="font-semibold text-ink">iyzico</strong> altyapısı üzerinden alınır.
            Kart numarası, son kullanma tarihi ve güvenlik kodu{" "}
            <strong className="font-semibold text-ink">bize hiçbir zaman ulaşmaz</strong>; doğrudan
            iyzico tarafından, kart kuruluşlarının güvenlik standartlarına (PCI-DSS) uygun olarak
            işlenir.
          </p>
          <Liste
            maddeler={[
              "Bizde yalnızca ödemenin sonucu (tutar, tarih, başarılı/başarısız) ve fatura düzenlemek için gereken ad soyad/unvan, e-posta, telefon ve fatura adresi tutulur.",
              "Bu bilgiler aboneliğin yürütülmesi, faturalandırma ve vergi mevzuatından doğan saklama yükümlülükleri için işlenir; fatura kayıtları yasal süre boyunca saklanır.",
              "Müşterilerin (kiracıların) ödeme bilgisi RentQR üzerinden toplanmaz.",
            ]}
          />
        </Bolum>

        <Bolum baslik="QR kodu okutan ziyaretçiler">
          <p className="text-ink-muted">
            Bir ürünün QR kodu okutulduğunda satıcının kaç kez okutulduğunu görebilmesi için bir
            kayıt tutulur. Bu kayıtta <strong className="font-semibold text-ink">ham IP adresi
            saklanmaz</strong>: IP ve tarayıcı bilgisi tuzlanmış tek yönlü bir özete çevrilir ve
            yalnızca aynı kişinin sayfayı yenilemesini tek okutma saymak için kullanılır. Özetten
            geriye kimliğe ulaşılamaz.
          </p>
          <p className="text-ink-muted">
            Panelde görünen “şu an kaç kişi bakıyor” sayacı da aynı yöntemle çalışır ve yalnızca bir
            sayıdan ibarettir.
          </p>
        </Bolum>

        <Bolum baslik="Güvenlik kayıtları">
          <p className="text-ink-muted">
            Başarısız giriş denemeleri, hız sınırına takılan istekler ve yetkisiz erişim denemeleri
            kaydedilir. Bu kayıtta denenen kullanıcı adı, IP adresi ve tarayıcı bilgisi bulunur —
            şifre <em>asla</em> kaydedilmez. Amaç yalnızca hesapları saldırıya karşı korumak ve bir
            olayın geriye dönük incelenebilmesidir. Müşteri bilgileri bu kayda hiç girmez.
          </p>
        </Bolum>

        <Bolum baslik="Ne kadar saklanıyor?">
          <p className="text-ink-muted">
            Rezervasyonlar, müşteri bilgileri ve katalog satıcı silene kadar saklanır. Satıcı bir
            rezervasyonu sildiğinde kayıt tamamen kaldırılır, arşivlenmez.
          </p>
        </Bolum>

        <Bolum baslik="Kimlerle paylaşılıyor?">
          <p className="text-ink-muted">
            Veriler satılmaz ve reklam amacıyla paylaşılmaz. Sistemin çalışması için yalnızca şu
            hizmet sağlayıcılar kullanılır:
          </p>
          <Liste
            maddeler={[
              <>
                <strong className="font-semibold text-ink">Supabase</strong> — veritabanı ve kimlik
                doğrulama.
              </>,
              <>
                <strong className="font-semibold text-ink">Vercel</strong> — uygulamanın
                barındırılması.
              </>,
              <>
                <strong className="font-semibold text-ink">iyzico Ödeme Hizmetleri A.Ş.</strong> —
                abonelik ödemelerinin alınması. Kart bilgileri yalnızca iyzico’da işlenir.
              </>,
            ]}
          />
          <p className="text-ink-muted">
            Bunun dışında veriler yalnızca yasal bir zorunluluk hâlinde yetkili makamlarla
            paylaşılır.
          </p>
        </Bolum>

        <Bolum baslik="Çerezler">
          <p className="text-ink-muted">
            Reklam veya izleme çerezi kullanılmıyor. Yalnızca oturumun açık kalması için gereken
            kimlik doğrulama çerezleri ve tema/görünüm tercihiniz gibi ayarlar tarayıcınızda
            tutulur.
          </p>
        </Bolum>

        <Bolum id="veri-silme" baslik="Verilerinizi silme">
          <p className="text-ink-muted">
            Verilerinizin silinmesini istiyorsanız yapmanız gereken şey kim olduğunuza göre
            değişir:
          </p>
          <Liste
            maddeler={[
              <>
                <strong className="font-semibold text-ink">Müşteriyseniz</strong> (bir ürün
                kiraladınız): kiralama yaptığınız işletmeye
                başvurun; kaydınızı panelinden silebilir. İşletmeye ulaşamıyorsanız{" "}
                <a href={`mailto:${EPOSTA}`} className="link-underline font-medium text-accent">
                  {EPOSTA}
                </a>{" "}
                adresine yazın, kaydı bulup sileriz.
              </>,
              <>
                <strong className="font-semibold text-ink">Satıcıysanız:</strong> hesabınızın ve
                bağlı bütün verilerin silinmesi için {EPOSTA} adresine yazın. Hesap silindiğinde
                ürünleriniz ve rezervasyonlarınız da birlikte silinir.
              </>,
            ]}
          />
          <p className="text-ink-muted">
            Silme talepleri en geç 30 gün içinde sonuçlandırılır ve size yazılı olarak bildirilir.
          </p>
        </Bolum>

        <Bolum baslik="Haklarınız">
          <p className="text-ink-muted">
            6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında; hakkınızda veri işlenip
            işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, amacına uygun
            kullanılıp kullanılmadığını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini,
            şartları oluştuğunda silinmesini isteme ve işlemeye itiraz etme haklarına sahipsiniz.
            Bu talepler için{" "}
            <a href={`mailto:${EPOSTA}`} className="link-underline font-medium text-accent">
              {EPOSTA}
            </a>{" "}
            adresine yazabilirsiniz.
          </p>
        </Bolum>

        <Bolum baslik="Değişiklikler">
          <p className="text-ink-muted">
            Bu metin sistem değiştikçe güncellenir. Üstteki “son güncelleme” tarihi her zaman
            yürürlükteki sürümü gösterir.
          </p>
        </Bolum>
    </YasalSayfa>
  );
}
