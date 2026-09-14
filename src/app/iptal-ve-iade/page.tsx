import type { Metadata } from "next";
import YasalSayfa, { B, Bolum, IcBaglanti, Liste, P, Sirket } from "@/components/yasal/YasalSayfa";

/**
 * İptal ve iade koşulları. Mesafeli Satış Sözleşmesi'nin cayma ve yenileme
 * maddeleriyle aynı şeyi söylemeli; birinde süre değişirse diğerinde de
 * değişir.
 */

export const metadata: Metadata = {
  title: "İptal ve İade Koşulları — RentQR",
  description: "RentQR aboneliğinin nasıl iptal edileceği, 14 günlük iade hakkı ve ücret iadelerinin işleyişi.",
};

export default function IptalVeIadePage() {
  return (
    <YasalSayfa
      href="/iptal-ve-iade"
      baslik="İptal ve İade Koşulları"
      giris="Bu metin RentQR aboneliğinin nasıl iptal edileceğini ve hangi durumlarda ücret iadesi yapılacağını anlatır."
    >
      <div className="card border-accent/30 bg-accent-soft/40 text-sm text-ink">
        RentQR şu anda ücretsizdir; iptal edilecek bir ödeme veya abonelik yoktur. Aşağıdaki koşullar
        ücretli abonelik planları kullanıma açıldığında uygulanır.
      </div>

      <Bolum baslik="Kısaca">
        <Liste
          maddeler={[
            <>
              İlk aboneliğinizi başladığı günden itibaren <B>14 gün içinde</B> iptal ederseniz
              ödediğiniz tutarın <B>tamamı</B> iade edilir.
            </>,
            "Bu süreden sonra aboneliğinizi istediğiniz zaman iptal edebilirsiniz; iptal dönem sonunda geçerli olur ve o güne kadar kullanmaya devam edersiniz.",
            "İptal için ceza ya da ek ücret alınmaz.",
          ]}
        />
      </Bolum>

      <Bolum baslik="Aboneliği iptal etme">
        <P>
          Aboneliğinizi satıcı panelindeki abonelik ekranından ya da kayıtlı e-posta adresinizden{" "}
          <Sirket alan="eposta" /> adresine yazarak iptal edebilirsiniz. İptal talebiniz alındığında
          e-posta ile onaylanır.
        </P>
        <P>
          İptal, otomatik yenilemeyi durdurur. Ödemesini yaptığınız dönemin sonuna kadar ücretli plan
          özelliklerini kullanmaya devam edersiniz; dönem bittiğinde yeniden ücret alınmaz. Hesabınız
          ve verileriniz silinmez — hesabınızı da kapatmak istiyorsanız bunu ayrıca belirtin.
        </P>
      </Bolum>

      <Bolum id="14-gun" baslik="14 günlük iade hakkı">
        <Liste
          maddeler={[
            "İlk ücretli aboneliğinizin başladığı tarihten itibaren 14 gün içinde iptal ederseniz, hizmeti kullanmış olsanız bile ödediğiniz tutarın tamamı iade edilir. Gerekçe göstermeniz gerekmez.",
            "Yıllık aboneliklerde aynı hak, her yıllık yenilemenin tahsil edildiği tarihten itibaren 14 gün içinde de geçerlidir.",
            "Aylık aboneliklerin yenilemelerinde bu süre uygulanmaz; iptal dönem sonunda geçerli olur.",
            <>
              Bu hak hem tüketicilere hem işletmelere tanınır. Tüketicilerin kanundan doğan cayma hakkı
              için{" "}
              <IcBaglanti href="/mesafeli-satis-sozlesmesi#cayma">
                Mesafeli Satış Sözleşmesi
              </IcBaglanti>
              ’ne bakabilirsiniz.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="14 gün geçtikten sonra">
        <P>
          İçinde bulunulan dönemin kullanılmamış kısmı için kısmi iade yapılmaz. Aşağıdaki durumlar
          bunun istisnasıdır:
        </P>
        <Liste
          maddeler={[
            <>
              <B>Hatalı veya mükerrer çekim:</B> aynı dönem için birden fazla ücret alınmışsa ya da
              iptal ettiğiniz bir abonelik yenilenmişse fazladan alınan tutarın tamamı iade edilir.
            </>,
            <>
              <B>Hizmetin Veyro Labs tarafından sonlandırılması:</B> Üyelik Sözleşmesi’ni ihlal
              etmediğiniz hâlde hesabınız kapatılır ya da hizmet sona erdirilirse, ödediğiniz dönemin
              kalan kısmı gün hesabıyla iade edilir.
            </>,
            <>
              <B>Hizmetin ifa edilememesi:</B> ödemenize rağmen hizmet hesabınızda kullanıma açılamazsa
              ödediğiniz tutarın tamamı iade edilir.
            </>,
          ]}
        />
        <P>
          Üyelik Sözleşmesi’ne aykırılık nedeniyle askıya alınan veya kapatılan hesaplarda kalan süre
          için iade yapılmaz.
        </P>
      </Bolum>

      <Bolum baslik="Plan değişiklikleri">
        <Liste
          maddeler={[
            "Daha kapsamlı bir plana geçiş hemen geçerli olur; içinde bulunulan dönemin kalan günleri için yalnızca iki plan arasındaki fark tahsil edilir.",
            "Daha dar bir plana geçiş, içinde bulunulan dönemin sonunda geçerli olur; aradaki fark iade edilmez.",
          ]}
        />
      </Bolum>

      <Bolum baslik="İade nasıl yapılır?">
        <P>
          İadeler, iade talebinin onaylandığı tarihten itibaren en geç <B>14 gün</B> içinde ödemenin
          yapıldığı kartla ve aynı yolla yapılır; nakit veya başka bir hesaba iade yapılmaz. Tutarın
          kart hesabınıza yansıma süresi bankanıza bağlıdır. Taksitli ödemelerde iade, bankanın
          uygulamasına göre taksitler hâlinde yansıyabilir.
        </P>
      </Bolum>

      <Bolum baslik="Ürün kiralamalarındaki iptal ve iadeler">
        <P>
          RentQR üzerinden rezervasyonu yapılan ürün kiralamalarının iptali, kira bedelinin ve
          teminatın iadesi, <B>ürünü kiraya veren işletmenin kendi koşullarına tabidir</B>. Veyro Labs
          bu kiralamalara taraf değildir ve kiracılardan ödeme almaz. Bir kiralamayla ilgili iptal veya
          iade talebinizi doğrudan kiralama yaptığınız işletmeye iletin.
        </P>
      </Bolum>

      <Bolum baslik="İletişim">
        <P>
          İptal ve iade talepleriniz için <Sirket alan="eposta" /> adresine yazabilir veya{" "}
          <Sirket alan="telefon" /> numarasından bize ulaşabilirsiniz.
        </P>
      </Bolum>
    </YasalSayfa>
  );
}
