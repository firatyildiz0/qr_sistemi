import type { Metadata } from "next";
import YasalSayfa, { B, Bolum, IcBaglanti, Liste, P } from "@/components/yasal/YasalSayfa";
import { CEREZ_BILDIRIMI_COOKIE } from "@/lib/yasal";
import { PREFERENCES_COOKIE } from "@/lib/preferences";

/**
 * Çerez politikası.
 *
 * Tablodaki her satır kodda gerçekten yazılan bir çereze karşılık geliyor:
 * Supabase oturum çerezi (`lib/supabase`, `proxy.ts`), görünüm tercihi
 * (`lib/preferences.ts`), çerez bildirimi (`components/yasal/CerezBildirimi`)
 * ve Instagram bağlantısının geçici doğrulama çerezi
 * (`api/instagram/baglan`). Yeni bir çerez ya da tarayıcı depolaması eklenirse
 * burası da güncellenmeli.
 */

export const metadata: Metadata = {
  title: "Çerez Politikası — RentQR",
  description: "RentQR'da kullanılan çerezler, ne işe yaradıkları ve nasıl yönetebileceğiniz.",
};

const CEREZLER: { ad: string; amac: string; sure: string; tur: string }[] = [
  {
    ad: "sb-…-auth-token",
    amac: "Satıcı paneline giriş yaptığınızda oturumunuzu açık tutar. Olmadan giriş yapılamaz.",
    sure: "Çıkış yapana kadar, en fazla 400 gün",
    tur: "Zorunlu",
  },
  {
    ad: "ig_state",
    amac: "Instagram hesabı bağlanırken isteğin gerçekten sizden geldiğini doğrular. Yalnızca bağlantı sırasında yazılır.",
    sure: "10 dakika",
    tur: "Zorunlu",
  },
  {
    ad: PREFERENCES_COOKIE,
    amac: "Seçtiğiniz tema, renk ve yoğunluk gibi görünüm tercihlerini hatırlar. Kişisel veri içermez.",
    sure: "1 yıl",
    tur: "Tercih",
  },
  {
    ad: CEREZ_BILDIRIMI_COOKIE,
    amac: "Çerez bildirimini kapattığınızı hatırlar, böylece her sayfada yeniden gösterilmez.",
    sure: "1 yıl",
    tur: "Zorunlu",
  },
];

export default function CerezPolitikasiPage() {
  return (
    <YasalSayfa
      href="/cerez-politikasi"
      baslik="Çerez Politikası"
      giris="Bu metin RentQR’da hangi çerezlerin neden kullanıldığını ve bunları nasıl yönetebileceğinizi anlatır."
    >
      <Bolum baslik="Çerez nedir?">
        <P>
          Çerezler, ziyaret ettiğiniz bir sitenin tarayıcınıza kaydettiği küçük metin dosyalarıdır.
          Sitenin sizi sayfadan sayfaya tanımasını, örneğin giriş yaptığınızı hatırlamasını sağlarlar.
        </P>
      </Bolum>

      <Bolum baslik="Kısaca">
        <P>
          RentQR’da <B>reklam, analitik, pazarlama veya sosyal medya takip çerezi yoktur.</B>{" "}
          Üçüncü taraf bir hizmetin tarayıcınıza çerez yazmasına izin verilmez. Kullanılan çerezlerin
          tamamı RentQR’ın kendi alan adına aittir ve sitenin çalışması ya da sizin yaptığınız bir
          tercihin hatırlanması için gereklidir.
        </P>
      </Bolum>

      <Bolum baslik="Kullandığımız çerezler">
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="bg-surface text-ink">
              <tr>
                <th className="p-3 font-semibold">Çerez</th>
                <th className="p-3 font-semibold">Ne işe yarar?</th>
                <th className="p-3 font-semibold">Süre</th>
                <th className="p-3 font-semibold">Tür</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-ink-muted">
              {CEREZLER.map((cerez) => (
                <tr key={cerez.ad} className="align-top">
                  <td className="p-3 font-mono text-xs text-ink">{cerez.ad}</td>
                  <td className="p-3">{cerez.amac}</td>
                  <td className="p-3 whitespace-nowrap">{cerez.sure}</td>
                  <td className="p-3">{cerez.tur}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Bolum>

      <Bolum baslik="Tarayıcı depolaması">
        <P>
          Çerezlerin yanında, tarayıcınızın yerel depolama alanında sunucuya hiç gönderilmeyen iki
          küçük bilgi tutulabilir:
        </P>
        <Liste
          maddeler={[
            "Satıcı panelinde ürünleri liste mi ızgara mı görmeyi seçtiğiniz.",
            "Sayfa bulunamadığında açılan mini oyundaki en yüksek skorunuz.",
          ]}
        />
        <P>Bu bilgiler kişisel veri içermez ve yalnızca sizin cihazınızda kalır.</P>
      </Bolum>

      <Bolum baslik="Hukuki dayanak">
        <P>
          Zorunlu çerezler, talep ettiğiniz hizmetin sunulabilmesi için kesinlikle gereklidir ve
          6698 sayılı Kanun’un 5. maddesinin 2. fıkrasının (c) ve (f) bentlerine dayanılarak
          kullanılır; bunlar için açık rıza aranmaz. Tercih çerezi yalnızca sizin seçtiğiniz görünüm
          ayarını tutar, kimliğinizi belirlemeye yarayan bir bilgi içermez. Ayrıntılı bilgi için{" "}
          <IcBaglanti href="/kvkk">KVKK Aydınlatma Metni</IcBaglanti>’ne bakabilirsiniz.
        </P>
        <P>
          İleride analitik veya pazarlama amaçlı bir çerez kullanılmaya karar verilirse, bu çerez
          önceden açık rızanız alınmadan yazılmaz ve bu metin güncellenir.
        </P>
      </Bolum>

      <Bolum baslik="Çerezleri nasıl yönetebilirsiniz?">
        <P>
          Çerezleri tarayıcınızın ayarlarından görebilir ve silebilirsiniz. Oturum çerezini silerseniz
          ya da engellerseniz satıcı paneline giriş yapamazsınız; tercih çerezini silerseniz görünüm
          ayarlarınız varsayılana döner.
        </P>
        <Liste
          maddeler={[
            <a
              key="chrome"
              href="https://support.google.com/chrome/answer/95647?hl=tr"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline font-medium text-accent"
            >
              Google Chrome
            </a>,
            <a
              key="safari"
              href="https://support.apple.com/tr-tr/guide/safari/sfri11471/mac"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline font-medium text-accent"
            >
              Safari
            </a>,
            <a
              key="firefox"
              href="https://support.mozilla.org/tr/kb/cerezleri-silme-web-sitelerinin-bilgilerini-kaldirma"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline font-medium text-accent"
            >
              Mozilla Firefox
            </a>,
            <a
              key="edge"
              href="https://support.microsoft.com/tr-tr/microsoft-edge/microsoft-edge-de-tanımlama-bilgilerini-silme-63947406-40ac-c3b8-57b9-2a946a29ae09"
              target="_blank"
              rel="noopener noreferrer"
              className="link-underline font-medium text-accent"
            >
              Microsoft Edge
            </a>,
          ]}
        />
      </Bolum>
    </YasalSayfa>
  );
}
