import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, EpostaLink, Paragraf, YasalSayfa } from "@/components/yasal/YasalSayfa";
import { SATICI } from "@/lib/yasal";

/**
 * Çerez politikası.
 *
 * KVKK'nın Çerez Uygulamaları Hakkında Rehberi'ne göre kimlik doğrulama,
 * güvenlik ve arayüz tercihi çerezleri (Kriter B) açık rıza gerektirmiyor, ama
 * aydınlatma gerekiyor; aydınlatmanın da sade ve gizlilik metninden ayrı
 * olması öneriliyor. Bu yüzden onay bandı yok, bu sayfa var.
 *
 * Tablo koddan yazıldı: `@supabase/ssr` oturum çerezi, `rentqr_prefs`
 * (lib/preferences.ts), `rentqr_plan` (lib/usage.ts) ve tarayıcı deposundaki
 * iki anahtar. Yeni bir çerez ya da analiz aracı eklenirse — özellikle izleme
 * amaçlı biri — burası güncellenmeli ve o araç için açık rıza alınmalı.
 */

export const metadata: Metadata = {
  title: `Çerez Politikası — ${SATICI.urun}`,
  description: `${SATICI.urun}'ın kullandığı çerezler ve neden kullandığı.`,
};

type Satir = { ad: string; amac: string; sure: string };

const CEREZLER: Satir[] = [
  {
    ad: "sb-…-auth-token",
    amac: "Giriş yaptığınızda oturumunuzu açık tutar. Şifre sıfırlarken kısa süreli bir doğrulama çerezi de eklenir.",
    sure: "Çıkış yapana kadar, en fazla 400 gün",
  },
  {
    ad: "rentqr_prefs",
    amac: "Tema (açık/koyu), renk, yoğunluk ve hareket azaltma gibi görünüm tercihlerinizi hatırlar.",
    sure: "1 yıl",
  },
  {
    ad: "rentqr_plan",
    amac: "Yalnızca site yöneticisinde: kullanım ekranında hangi planın seçildiğini hatırlar.",
    sure: "1 yıl",
  },
];

const DEPO: Satir[] = [
  {
    ad: "admin-product-view",
    amac: "Satıcı panelinde ürünlerin liste mi kutu mu gösterileceği.",
    sure: "Siz silene kadar",
  },
  {
    ad: "rentqr.404.rekor, rentqr.404.ses",
    amac: "Bulunamayan sayfa ekranındaki oyunun rekoru ve ses tercihi.",
    sure: "Siz silene kadar",
  },
];

function Tablo({ satirlar }: { satirlar: Satir[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-card text-ink">
          <tr>
            <th className="px-4 py-2.5 font-semibold">Ad</th>
            <th className="px-4 py-2.5 font-semibold">Ne işe yarar</th>
            <th className="px-4 py-2.5 font-semibold">Süre</th>
          </tr>
        </thead>
        <tbody className="text-ink-muted">
          {satirlar.map((s) => (
            <tr key={s.ad} className="border-t border-border align-top">
              <td className="px-4 py-2.5 font-mono text-xs text-ink">{s.ad}</td>
              <td className="px-4 py-2.5">{s.amac}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{s.sure}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CerezPolitikasiPage() {
  return (
    <YasalSayfa
      baslik="Çerez Politikası"
      guncelleme="22 Ekim 2026"
      giris={`${SATICI.urun}’ın tarayıcınızda hangi çerezleri ve kayıtları tuttuğunu, neden tuttuğunu anlatır.`}
    >
      <Bolum baslik="Kısaca">
        <Paragraf>
          Reklam, pazarlama, analiz ya da sizi başka sitelerde izleme amaçlı çerez kullanmıyoruz.
          Kullandıklarımızın hepsi sitenin çalışması için gerekli olan ya da sizin seçtiğiniz bir
          ayarı hatırlayan çerezlerdir. Bu tür çerezler için açık rızanız aranmaz; yine de neyin
          tutulduğunu bilmeniz için hepsini aşağıda listeliyoruz.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Çerezler">
        <Tablo satirlar={CEREZLER} />
      </Bolum>

      <Bolum baslik="Tarayıcı deposu">
        <Paragraf>
          Aşağıdaki kayıtlar çerez değildir, tarayıcınızın yerel deposunda durur ve sunucuya hiç
          gönderilmez.
        </Paragraf>
        <Tablo satirlar={DEPO} />
      </Bolum>

      <Bolum baslik="Ödeme ekranı">
        <Paragraf>
          Abonelik ödemesi sırasında açılan form iyzico’ya aittir ve güvenlik ile dolandırıcılık
          önleme için kendi çerezlerini kullanabilir. Bu çerezler iyzico’nun kendi gizlilik ve
          çerez politikalarına tabidir.
        </Paragraf>
      </Bolum>

      <Bolum baslik="Çerezleri yönetme">
        <Paragraf>
          Çerezleri tarayıcınızın ayarlarından görebilir ve silebilirsiniz. Oturum çerezini
          silerseniz çıkış yapmış olursunuz; tercih çerezini silerseniz görünüm ayarlarınız
          varsayılana döner.
        </Paragraf>
        <Paragraf>
          Kişisel verilerinizin genel olarak nasıl işlendiği{" "}
          <Link href="/gizlilik" className="link-underline font-medium text-accent">
            Gizlilik Sözleşmesi
          </Link>
          ’nde anlatılır. Sorularınız için <EpostaLink /> adresine yazabilirsiniz.
        </Paragraf>
      </Bolum>
    </YasalSayfa>
  );
}
