import type { Metadata } from "next";
import Link from "next/link";

/**
 * Gizlilik politikası.
 *
 * Metin şablondan değil, şemadan yazıldı: burada sayılan her alan gerçekten
 * `supabase/schema.sql` içinde duran bir kolona karşılık geliyor ve sayılmayan
 * hiçbir şey toplanmıyor. Bir gizlilik metninin tek işi bu — ne toplandığını
 * doğru söylemek. Yeni bir alan eklendiğinde burası da güncellenmeli, yoksa
 * metin sessizce yalan söylemeye başlar.
 *
 * Sayfa herkese açık ve oturum istemiyor: Meta uygulama incelemesi adresi
 * dışarıdan açabilmek zorunda, müşteri de rezervasyon yapmadan önce okuyabilmeli.
 */

export const metadata: Metadata = {
  title: "Gizlilik Politikası — RentQR",
  description:
    "RentQR'ın hangi verileri topladığı, neden topladığı, ne kadar sakladığı ve nasıl sildirebileceğiniz.",
};

const GUNCELLEME = "8 Eylül 2026";
const EPOSTA = "veyro.ro@gmail.com";

function Bolum({
  id,
  baslik,
  children,
}: {
  id?: string;
  baslik: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-3">
      <h2 className="text-xl font-bold tracking-tight text-ink">{baslik}</h2>
      {children}
    </section>
  );
}

function Liste({ maddeler }: { maddeler: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 text-ink-muted">
      {maddeler.map((madde, sira) => (
        <li key={sira} className="flex gap-2.5">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink-muted" />
          <span>{madde}</span>
        </li>
      ))}
    </ul>
  );
}

export default function GizlilikPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12 sm:py-16">
      <header className="space-y-3 border-b border-border pb-8">
        <Link
          href="/"
          className="text-sm font-medium text-ink-muted transition-colors hover:text-accent-hover"
        >
          ← RentQR
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
          Gizlilik Politikası
        </h1>
        <p className="text-ink-muted">
          Son güncelleme: {GUNCELLEME}. Bu metin RentQR’ın hangi verileri topladığını, neden
          topladığını, ne kadar sakladığını ve nasıl sildirebileceğinizi anlatır.
        </p>
      </header>

      <div className="mt-10 space-y-10">
        <Bolum baslik="Kim işliyor?">
          <p className="text-ink-muted">
            RentQR, <strong className="font-semibold text-ink">Veyro Labs</strong> tarafından
            işletilen bir kiralama takip sistemidir. Veri sorumlusu Veyro Labs’tır. Her konuda{" "}
            <a href={`mailto:${EPOSTA}`} className="link-underline font-medium text-accent">
              {EPOSTA}
            </a>{" "}
            adresinden ulaşabilirsiniz.
          </p>
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
                kişi. Müşterinin panelde hesabı yoktur; bilgilerini ya satıcı girer ya da müşteri
                Instagram üzerinden kendisi gönderir.
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

        <Bolum id="instagram" baslik="Instagram üzerinden rezervasyon">
          <p className="text-ink-muted">
            Satıcı isterse Instagram işletme hesabını RentQR’a bağlayabilir. Bağlandığında,
            hesabına mesaj yazan müşteriler rezervasyon talebi oluşturabilir. Bu durumda:
          </p>
          <Liste
            maddeler={[
              "Müşterinin Instagram kullanıcı kimliği, sohbetin hangi adımda olduğu ve talebi tamamlamak için yazdığı bilgiler (ürün kodu, tarihler, ad, telefon, il/ilçe) saklanır.",
              "Sohbetin tamamı saklanmaz; yalnızca rezervasyon talebini oluşturmak için gereken alanlar tutulur.",
              "Aynı mesajın iki kez işlenmesini önlemek için mesaj kimlikleri 7 gün boyunca tutulur ve sonra silinir.",
              "Satıcı adına mesaj gönderebilmek için Instagram’dan alınan erişim anahtarı sunucuda saklanır; tarayıcıya hiçbir zaman gönderilmez.",
            ]}
          />
          <p className="text-ink-muted">
            Instagram’a giden tek şey müşteriye yazılan cevap mesajlarıdır. Instagram üzerindeki
            mesajlaşma ayrıca Meta’nın kendi gizlilik politikasına tabidir. Satıcı bağlantıyı
            panelden istediği an kesebilir; kestiğinde erişim anahtarı silinir.
          </p>
        </Bolum>

        <Bolum baslik="Ne kadar saklanıyor?">
          <Liste
            maddeler={[
              "Güvenlik kayıtları: 90 gün",
              "QR okutma kayıtları: 400 gün",
              "Instagram mesaj kimlikleri: 7 gün",
              "Anlık ziyaretçi kayıtları: 1 gün",
              <>
                Rezervasyonlar, müşteri bilgileri ve katalog: satıcı silene kadar. Satıcı bir
                rezervasyonu sildiğinde kayıt tamamen kaldırılır, arşivlenmez.
              </>,
            ]}
          />
          <p className="text-ink-muted">
            İlk dört kalem her gün çalışan otomatik bir bakım işiyle silinir; elle müdahale
            gerekmez.
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
                <strong className="font-semibold text-ink">Meta (Instagram)</strong> — yalnızca
                Instagram bağlantısı kuran satıcılar için, mesajlaşma.
              </>,
              <>
                <strong className="font-semibold text-ink">Resend</strong> — yalnızca sistem
                yöneticisine gönderilen güvenlik uyarı e-postaları. Müşteri verisi içermez.
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
                kiraladınız ya da Instagram’dan talep gönderdiniz): kiralama yaptığınız işletmeye
                başvurun; kaydınızı panelinden silebilir. İşletmeye ulaşamıyorsanız{" "}
                <a href={`mailto:${EPOSTA}`} className="link-underline font-medium text-accent">
                  {EPOSTA}
                </a>{" "}
                adresine yazın, kaydı bulup sileriz.
              </>,
              <>
                <strong className="font-semibold text-ink">Instagram sohbet verileriniz için:</strong>{" "}
                aynı adrese Instagram kullanıcı adınızla birlikte yazmanız yeterli. Ayrıca{" "}
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
                <strong className="font-semibold text-ink">Satıcıysanız:</strong> hesabınızın ve
                bağlı bütün verilerin silinmesi için {EPOSTA} adresine yazın. Hesap silindiğinde
                ürünleriniz, rezervasyonlarınız ve Instagram bağlantınız da birlikte silinir.
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
      </div>

      <footer className="mt-12 border-t border-border pt-8 text-sm text-ink-muted">
        <p>
          Sorularınız için:{" "}
          <a href={`mailto:${EPOSTA}`} className="link-underline font-medium text-accent">
            {EPOSTA}
          </a>
        </p>
        <p className="mt-2">© {new Date().getFullYear()} Veyro Labs — RentQR</p>
      </footer>
    </main>
  );
}
