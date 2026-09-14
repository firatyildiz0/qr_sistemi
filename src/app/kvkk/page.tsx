import type { Metadata } from "next";
import YasalSayfa, {
  B,
  Bolum,
  Eposta,
  IcBaglanti,
  Liste,
  P,
  Sirket,
  SirketKunyesi,
} from "@/components/yasal/YasalSayfa";

/**
 * KVKK aydınlatma metni (6698 sayılı Kanun m.10 ve Aydınlatma Yükümlülüğünün
 * Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ).
 *
 * Gizlilik politikası "ne toplanıyor" sorusunu ayrıntılı cevaplıyor; bu metin
 * Kanun'un zorunlu tuttuğu başlıkları — veri sorumlusu, amaç, hukuki sebep,
 * aktarım, toplama yöntemi, haklar — sırasıyla veriyor. İkisi aynı gerçeği
 * anlatmalı: bir veri kalemi eklenirse ikisi birlikte güncellenir.
 */

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni — RentQR",
  description:
    "RentQR kapsamında kişisel verilerin hangi amaçla, hangi hukuki sebeple işlendiği ve 6698 sayılı Kanun'dan doğan haklarınız.",
};

const AMACLAR: { amac: string; veriler: string; sebep: string }[] = [
  {
    amac: "Üyelik başvurusunun alınması, değerlendirilmesi ve hesabın yönetimi",
    veriler: "E-posta adresi, kullanıcı adı, şifre özeti, kabul edilen sözleşme sürümü",
    sebep: "Sözleşmenin kurulması ve ifası (m.5/2-c)",
  },
  {
    amac: "Hizmetin sunulması: ürün kataloğu, QR etiketleri, müsaitlik takvimi, rezervasyon ve bildirimler",
    veriler: "Katalog ve rezervasyon kayıtları, işletme ayarları",
    sebep: "Sözleşmenin ifası (m.5/2-c)",
  },
  {
    amac: "Instagram hesabının bağlanması ve mesajla gelen rezervasyon taleplerinin işlenmesi",
    veriler: "Instagram işletme hesabı kimliği, erişim anahtarı, talep bilgileri",
    sebep: "Sözleşmenin ifası (m.5/2-c)",
  },
  {
    amac: "Hesapların saldırılara karşı korunması ve kötüye kullanımın önlenmesi",
    veriler: "IP adresi, tarayıcı bilgisi, denenen kullanıcı adı, olay zamanı",
    sebep: "Veri sorumlusunun meşru menfaati (m.5/2-f)",
  },
  {
    amac: "QR okutma ve anlık ziyaretçi sayılarının satıcıya gösterilmesi",
    veriler: "IP ve tarayıcı bilgisinden üretilen, geri döndürülemeyen özet",
    sebep: "Meşru menfaat (m.5/2-f)",
  },
  {
    amac: "Yazılım hatalarının tespiti ve giderilmesi",
    veriler: "Hata anındaki teknik bilgiler (kişisel veri gönderilmeyecek şekilde yapılandırılmıştır)",
    sebep: "Meşru menfaat (m.5/2-f)",
  },
  {
    amac: "Ücretli abonelikte faturalandırma ve muhasebe kayıtlarının tutulması",
    veriler: "Ad soyad veya unvan, fatura adresi, T.C. kimlik ya da vergi numarası, ödeme kayıtları",
    sebep: "Kanunlarda açıkça öngörülme ve hukuki yükümlülük (m.5/2-a, ç)",
  },
  {
    amac: "Yetkili kurumların talepleri ve olası uyuşmazlıklarda hakların korunması",
    veriler: "Yukarıdaki verilerden talep veya uyuşmazlıkla ilgili olanlar",
    sebep: "Hukuki yükümlülük; bir hakkın tesisi, kullanılması veya korunması (m.5/2-ç, e)",
  },
];

export default function KvkkPage() {
  return (
    <YasalSayfa
      href="/kvkk"
      baslik="KVKK Aydınlatma Metni"
      giris="Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun 10. maddesi uyarınca kişisel verilerinizin nasıl işlendiği konusunda sizi bilgilendirmek için hazırlanmıştır."
    >
      <Bolum baslik="1. Veri sorumlusu">
        <P>
          RentQR, <B>{"Veyro Labs"}</B> tarafından işletilir. Kanun kapsamında veri sorumlusu
          aşağıda bilgileri bulunan <Sirket alan="unvan" />’dır (“Veyro Labs”).
        </P>
        <SirketKunyesi />
      </Bolum>

      <Bolum baslik="2. Bu metin kimi kapsıyor?">
        <Liste
          maddeler={[
            <>
              <B>Satıcılar:</B> RentQR’a üye olan ya da üyelik başvurusu yapan işletmeler ve
              onların adına işlem yapan kişiler.
            </>,
            <>
              <B>Ziyaretçiler:</B> siteyi ziyaret eden veya bir ürünün QR kodunu okutan kişiler.
            </>,
          ]}
        />
        <P>
          <B>Kiracılar hakkında önemli not:</B> Bir satıcı, kendi müşterisinin (kiracının) adını,
          telefonunu ve adresini RentQR’a kaydettiğinde bu verilerin <B>veri sorumlusu satıcının
          kendisidir</B>; Veyro Labs bu verileri yalnızca satıcı adına ve hizmeti sunmak için
          işleyen <B>veri işleyendir</B>. Kiracıların aydınlatılması ve başvurularının
          cevaplanması satıcının yükümlülüğündedir. Kiracıysanız öncelikle kiralama yaptığınız
          işletmeye başvurun; ulaşamazsanız bize yazın, talebinizi ilgili satıcıya iletelim ve
          size yardımcı olalım.
        </P>
      </Bolum>

      <Bolum baslik="3. İşlenen veriler, amaçlar ve hukuki sebepler">
        <P>
          Kişisel verileriniz aşağıdaki amaçlarla ve karşılarında yazan hukuki sebeplere dayanarak
          işlenir. Hiçbir işleme faaliyeti açık rızaya dayanmaz; bu yüzden sizden açık rıza
          istenmez. Veriler pazarlama amacıyla kullanılmaz ve satılmaz.
        </P>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="p-3 font-semibold">Amaç</th>
                <th className="p-3 font-semibold">İşlenen veriler</th>
                <th className="p-3 font-semibold">Hukuki sebep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink-muted">
              {AMACLAR.map((satir) => (
                <tr key={satir.amac} className="align-top">
                  <td className="p-3">{satir.amac}</td>
                  <td className="p-3">{satir.veriler}</td>
                  <td className="p-3">{satir.sebep}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          Hangi alanın tam olarak ne olduğu ve ne kadar saklandığı{" "}
          <IcBaglanti href="/gizlilik">Gizlilik Politikası</IcBaglanti>’nda ayrıntılı olarak
          yazılıdır. Kart bilgileri Veyro Labs’a ulaşmaz; ücretli abonelikte ödeme, lisanslı ödeme
          kuruluşu <Sirket alan="odemeKurulusu" /> tarafından alınır.
        </P>
      </Bolum>

      <Bolum baslik="4. Verilerin toplanma yöntemi">
        <P>
          Kişisel verileriniz tamamen elektronik ortamda; üyelik formu ve satıcı paneli
          aracılığıyla sizin tarafınızdan, siteyi kullanırken sunucu kayıtları ve{" "}
          <IcBaglanti href="/cerez-politikasi">çerezler</IcBaglanti> aracılığıyla otomatik
          olarak ve Instagram hesabınızı bağlarsanız Meta’nın arayüzü üzerinden toplanır.
        </P>
      </Bolum>

      <Bolum baslik="5. Verilerin aktarılması">
        <P>
          Kişisel veriler yurt içinde yalnızca kanunen yetkili kamu kurum ve kuruluşlarına, talep
          edilmesi hâlinde ve Kanun’un 8. maddesine uygun olarak aktarılır.
        </P>
        <P>
          Sistemin çalışabilmesi için aşağıdaki hizmet sağlayıcılardan yararlanılır. Bu
          sağlayıcıların sunucuları yurt dışında bulunabileceğinden, veriler Kanun’un 9. maddesine
          uygun olarak ve uygun güvenceler (standart sözleşme) sağlanarak aktarılır:
        </P>
        <Liste
          maddeler={[
            <>
              <B>Supabase</B> — veritabanı, dosya depolama ve kimlik doğrulama
            </>,
            <>
              <B>Vercel</B> — uygulamanın barındırılması
            </>,
            <>
              <B>Sentry</B> — yazılım hatalarının izlenmesi
            </>,
            <>
              <B>Resend</B> — sistem yöneticisine giden güvenlik uyarısı e-postaları
            </>,
            <>
              <B>Meta Platforms (Instagram)</B> — yalnızca Instagram hesabını bağlayan satıcılar
              için mesajlaşma
            </>,
            <>
              <B>Ödeme kuruluşu</B> — ücretli abonelik başladığında, yalnızca ödeme işlemleri için
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="6. Saklama süresi">
        <P>
          Veriler işlendikleri amaç için gereken süre boyunca saklanır; süre dolduğunda silinir,
          yok edilir veya anonim hâle getirilir. Güvenlik kayıtları 90 gün, QR okutma kayıtları
          400 gün saklanır. Hesap ve katalog verileri üyelik sürdüğü müddetçe tutulur ve hesap
          kapatıldığında silinir. Fatura ve muhasebe kayıtları ise vergi mevzuatının öngördüğü
          süre boyunca (10 yıl) saklanır.
        </P>
      </Bolum>

      <Bolum baslik="7. Kanun’un 11. maddesi kapsamındaki haklarınız">
        <P>Veri sorumlusuna başvurarak:</P>
        <Liste
          maddeler={[
            "Kişisel verilerinizin işlenip işlenmediğini öğrenme,",
            "İşlenmişse buna ilişkin bilgi talep etme,",
            "İşlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,",
            "Yurt içinde veya yurt dışında aktarıldığı üçüncü kişileri bilme,",
            "Eksik veya yanlış işlenmişse düzeltilmesini isteme,",
            "Kanun’un 7. maddesindeki şartlar çerçevesinde silinmesini veya yok edilmesini isteme,",
            "Düzeltme, silme ve yok etme işlemlerinin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,",
            "İşlenen verilerin münhasıran otomatik sistemlerle analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,",
            "Kanuna aykırı işleme sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme",
          ]}
        />
        <P>haklarına sahipsiniz.</P>
      </Bolum>

      <Bolum id="basvuru" baslik="8. Başvuru yolu">
        <P>
          Başvurunuzu Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ’e uygun olarak;
        </P>
        <Liste
          maddeler={[
            <>
              <Sirket alan="adres" /> adresine ıslak imzalı dilekçeyle,
            </>,
            <>
              <Sirket alan="kep" /> adresine kayıtlı elektronik posta ile,
            </>,
            <>
              güvenli elektronik imza veya mobil imza ile ya da RentQR’da kayıtlı e-posta
              adresinizden <Eposta /> adresine
            </>,
          ]}
        />
        <P>
          iletebilirsiniz. Başvuruda adınız soyadınız, imzanız (yazılı başvurularda), Türkiye
          Cumhuriyeti vatandaşıysanız T.C. kimlik numaranız, tebligata esas adresiniz, e-posta
          adresiniz veya telefon numaranız ve talebinizin konusu bulunmalıdır.
        </P>
        <P>
          Başvurunuz en geç <B>30 gün</B> içinde ücretsiz olarak sonuçlandırılır. İşlemin ayrıca
          bir maliyet gerektirmesi hâlinde Kişisel Verileri Koruma Kurulu’nca belirlenen tarifedeki
          ücret alınabilir. Başvurunuz reddedilir, verilen cevabı yetersiz bulursanız veya süresinde
          cevap verilmezse; cevabı öğrendiğiniz tarihten itibaren 30 gün, her hâlde başvuru
          tarihinden itibaren 60 gün içinde Kişisel Verileri Koruma Kurulu’na şikâyette
          bulunabilirsiniz.
        </P>
      </Bolum>
    </YasalSayfa>
  );
}
