import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, EpostaLink, Liste, Paragraf, Vurgu, YasalSayfa } from "@/components/yasal/YasalSayfa";
import { ABONELIK, SATICI } from "@/lib/yasal";

/**
 * İşlem rehberi.
 *
 * Elektronik Ticaret Aracı Hizmet Sağlayıcı ve Elektronik Ticaret Hizmet
 * Sağlayıcılar Hakkında Yönetmelik (RG 29.12.2022/32058) m.7: kendi sitesinden
 * satış yapan hizmet sağlayıcı, ana sayfadan doğrudan ulaşılabilen "işlem
 * rehberi" başlığı altında sözleşmenin kurulma adımlarını, sözleşmenin
 * saklanıp saklanmadığını, veri hatalarını düzeltme araçlarını ve uyuşmazlık
 * yollarını göstermek zorunda. Adımlar /paketler → kayıt → /abonelik →
 * iyzico akışının kendisinden yazıldı; akış değişirse burası da değişmeli.
 */

const linkSinifi = "link-underline font-medium text-accent";

export const metadata: Metadata = {
  title: `İşlem Rehberi — ${SATICI.urun}`,
  description: `${SATICI.urun} aboneliğinin nasıl satın alındığı, sözleşmenin nasıl kurulduğu ve hataların nasıl düzeltileceği.`,
};

export default function IslemRehberiPage() {
  return (
    <YasalSayfa
      baslik="İşlem Rehberi"
      guncelleme="22 Ekim 2026"
      giris={`${ABONELIK.ad}’in satın alma adımlarını, sözleşmenin nasıl kurulduğunu ve bir yanlışlık olduğunda ne yapabileceğinizi anlatır.`}
    >
      <Bolum baslik="1. Satın alma adımları">
        <Liste
          maddeler={[
            <>
              <Vurgu>Paketi inceleyin.</Vurgu>{" "}
              <Link href="/paketler" className={linkSinifi}>
                Paketler
              </Link>{" "}
              sayfasında aboneliğin kapsamı ve fiyatı ({ABONELIK.donem} {ABONELIK.fiyat}, vergiler
              dahil) yazar. Hizmet dijitaldir; kargo ya da teslimat ücreti yoktur.
            </>,
            <>
              <Vurgu>Hesap açın.</Vurgu> E-posta adresiniz, kullanıcı adınız ve şifrenizle üye
              olursunuz. Hesabınız varsa giriş yapmanız yeterli.
            </>,
            <>
              <Vurgu>Fatura bilgilerinizi girin.</Vurgu> Ödeme ekranında ad soyad, T.C. kimlik
              numarası, cep telefonu, il ve adres istenir. Bunlar faturanın düzenlenmesi ve ödeme
              kuruluşunun kimlik doğrulaması içindir.
            </>,
            <>
              <Vurgu>Sözleşmeyi onaylayın.</Vurgu>{" "}
              <Link href="/on-bilgilendirme-formu" className={linkSinifi}>
                Ön Bilgilendirme Formu
              </Link>{" "}
              ile{" "}
              <Link href="/mesafeli-satis-sozlesmesi" className={linkSinifi}>
                Mesafeli Satış Sözleşmesi
              </Link>
              ’ni okuduğunuzu işaretlemeden ödeme adımına geçilemez.
            </>,
            <>
              <Vurgu>Ödemeyi yapın.</Vurgu> Kart bilgilerinizi lisanslı ödeme kuruluşu iyzico’nun
              güvenli formuna girersiniz; kart bilgisi bize ulaşmaz. Ödeme onaylandığında sözleşme
              kurulur ve panel aynı anda açılır.
            </>,
          ]}
        />
      </Bolum>

      <Bolum baslik="2. Sözleşmenin saklanması">
        <Paragraf>
          Yürürlükteki Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi ve Teslimat ve İade
          Şartları bu sitede yayımlanır; her zaman okunabilir, yazdırılabilir ya da tarayıcınızdan
          PDF olarak kaydedilebilir. Her metnin başında son güncelleme tarihi yazar.
        </Paragraf>
        <Paragraf>
          Satın aldığınız tarihte yürürlükte olan metnin bir örneğini isterseniz <EpostaLink />{" "}
          adresine hesabınıza kayıtlı e-posta adresinden yazın; size e-postayla göndeririz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="3. Hataları düzeltme">
        <Liste
          maddeler={[
            "Ödeme ekranındaki bilgileri, ödeme formuna geçmeden önce istediğiniz gibi değiştirebilirsiniz. Bir alan hatalıysa ekran sizi uyarır ve yazdıklarınız silinmez.",
            "Kart bilgilerini girdiğiniz iyzico formunda, ödemeyi onaylamadan önce tutar gösterilir; vazgeçerseniz ödeme yapılmaz.",
            "Ödemeden sonra fatura bilgilerinizde bir yanlışlık fark ederseniz bize yazın; faturayı düzeltiriz.",
            "Hatalı ya da mükerrer bir tahsilat olduysa ücret, en geç 14 gün içinde ödemenin yapıldığı karta iade edilir.",
          ]}
        />
      </Bolum>

      <Bolum baslik="4. İptal">
        <Paragraf>
          Aboneliğinizi abonelik ekranından ya da bize yazarak dilediğiniz zaman iptal edebilirsiniz. İptal,
          ödediğiniz dönemin sonunda geçerli olur ve sonraki dönem için ücret alınmaz. Ayrıntılar{" "}
          <Link href="/teslimat-ve-iade" className={linkSinifi}>
            Teslimat ve İade Şartları
          </Link>{" "}
          sayfasındadır.
        </Paragraf>
      </Bolum>

      <Bolum baslik="5. Şikâyet ve uyuşmazlık">
        <Paragraf>
          Şikâyetlerinizi <EpostaLink /> adresine ya da {SATICI.telefon} numarasına iletebilirsiniz.
          Çözülemeyen uyuşmazlıklarda, Ticaret Bakanlığı’nca her yıl ilan edilen parasal sınırlar
          dahilinde Tüketici Hakem Heyetleri’ne, bu sınırları aşan durumlarda Tüketici
          Mahkemeleri’ne başvurabilirsiniz. Başvuruları e-Devlet üzerinden Tüketici Bilgi Sistemi
          (TÜBİS) ile de yapabilirsiniz.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
