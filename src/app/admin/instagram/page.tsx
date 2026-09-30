import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { instagramYapilandirildi } from "@/lib/instagram/kurulum";
import { IconAlertTriangle, IconCheckCircle, IconInstagram } from "@/components/icons";
import BaglantiyiKesButonu from "@/components/instagram/BaglantiyiKesButonu";

/**
 * Instagram bağlantısının kurulduğu ekran.
 *
 * Bağlantıyı satıcı kendisi kuruyor: kendi işletme hesabına izin veriyor ve
 * belirteç sunucuda kalıyor. Ekran ayrıca akışın nasıl işlediğini anlatıyor —
 * satıcı müşterisine ne söyleyeceğini bilmeli, çünkü sohbetin ilk adımı ürün
 * kodu ve o kodu ilana yazacak olan kendisi.
 */

export const dynamic = "force-dynamic";

const DURUM_MESAJLARI: Record<string, { metin: string; iyi: boolean }> = {
  bagli: { metin: "Instagram hesabınız bağlandı. Artık mesajlardan rezervasyon alabilirsiniz.", iyi: true },
  vazgecildi: { metin: "Bağlantı yarıda kaldı — izin ekranında vazgeçildi.", iyi: false },
  dogrulanamadi: { metin: "Bağlantı doğrulanamadı. Lütfen baştan deneyin.", iyi: false },
  "kod-yok": { metin: "Instagram bir yetki kodu döndürmedi. Lütfen baştan deneyin.", iyi: false },
  "abone-olunamadi": {
    metin:
      "Hesap bağlandı ama Instagram mesajları bize iletmeyi henüz kabul etmedi. Aşağıdaki düğmeyle bir kez daha bağlayın.",
    iyi: false,
  },
  baglanamadi: { metin: "Instagram'a bağlanılamadı. Birkaç dakika sonra tekrar deneyin.", iyi: false },
  "baska-hesapta": {
    metin: "Bu Instagram hesabı başka bir satıcıya bağlı. Önce oradan bağlantıyı kesmelisiniz.",
    iyi: false,
  },
  yapilandirilmadi: {
    metin: "Instagram bağlantısı henüz açılmadı. Destek ekibine haber verin.",
    iyi: false,
  },
};

type Durum = {
  username: string | null;
  ig_user_id: string;
  is_active: boolean;
  token_expires_at: string | null;
  connected_at: string;
};

export default async function InstagramPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const [{ durum }, supabase] = await Promise.all([searchParams, createClient()]);

  // Tablo doğrudan okunamıyor (belirteç orada duruyor); bu fonksiyon yalnızca
  // belirteç dışındaki alanları döndürüyor.
  const { data } = await supabase.rpc("instagram_account_status");
  const hesap = ((data ?? []) as Durum[])[0] ?? null;

  const mesaj = durum ? DURUM_MESAJLARI[durum] : null;
  const yapilandirildi = instagramYapilandirildi();
  // Mesajlar gelmiyorsa tek düğmeyle aynı akış baştan: kayıt satıcı başına
  // tek satır, yeniden bağlamak onu günceller — önce kesmeye gerek yok.
  const yenidenBaglanmali = hesap && (!hesap.is_active || durum === "abone-olunamadi");

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-1 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Instagram</h1>
          <p className="text-sm text-ink-muted">
            Müşteriler mesajdan rezervasyon isteyebilsin.
          </p>
        </div>
        <Link href="/admin/talepler" className="btn btn-secondary self-start sm:self-auto">
          Gelen talepler
        </Link>
      </header>

      <div className="mx-auto w-full max-w-2xl flex-1 space-y-6 p-4 sm:p-8">
        {mesaj && (
          <p
            className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
              mesaj.iyi
                ? "border-success/30 bg-success/10 text-ink"
                : "notice-warning"
            }`}
          >
            {mesaj.iyi ? (
              <IconCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            ) : (
              <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            {mesaj.metin}
          </p>
        )}

        <section className="card space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-accent">
              <IconInstagram className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              {hesap ? (
                <>
                  <p className="font-semibold text-ink">
                    {hesap.username ? `@${hesap.username}` : "Instagram hesabı"}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {new Date(hesap.connected_at).toLocaleDateString("tr-TR")} tarihinde bağlandı.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-ink">Hesap bağlı değil</p>
                  <p className="text-sm text-ink-muted">
                    İşletme hesabınızı bağlayın; gelen mesajlara rezervasyon akışı yanıt versin.
                  </p>
                </>
              )}
            </div>
            {hesap && (
            <span className={`pill ${hesap.is_active ? "pill-success" : "pill-danger"}`}>
              {hesap.is_active ? "bağlı" : "durdu"}
            </span>
          )}
          </div>

          {!yapilandirildi ? (
            <p className="notice-warning text-sm">
              Instagram bağlantısı henüz açılmadı. Destek ekibine haber verin.
            </p>
          ) : hesap ? (
            <>
              {!hesap.is_active && (
                <p className="notice-warning text-sm">
                  Instagram yetkisinin süresi doldu. Mesajlara cevap verilmiyor — aşağıdan
                  yeniden bağlayın.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {yenidenBaglanmali && (
                  <a href="/api/instagram/baglan" className="btn btn-primary w-full sm:w-auto">
                    Yeniden bağla
                  </a>
                )}
                <BaglantiyiKesButonu />
              </div>
            </>
          ) : (
            <>
              <a href="/api/instagram/baglan" className="btn btn-primary w-full sm:w-auto">
                <IconInstagram className="h-4 w-4" />
                Instagram ile bağlan
              </a>
              <p className="text-xs text-ink-muted">
                Instagram açılır, hesabınızla giriş yapıp izin verirsiniz, buraya geri
                dönersiniz. Hesabınızın <span className="font-medium text-ink">İşletme</span> ya
                da <span className="font-medium text-ink">İçerik üreticisi</span> hesabı olması
                gerekir — kişisel hesaplar mesaj iznini vermiyor. Değiştirmek için Instagram’da
                Ayarlar → Hesap türü ve araçlar → Profesyonel hesaba geç.
              </p>
            </>
          )}
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold text-ink">Müşteri ne yapıyor?</h2>
          <ol className="space-y-2 text-sm text-ink-muted">
            <li>
              <span className="font-medium text-ink">1.</span> Hesabınıza mesaj atıyor ve ürün
              kodunu yazıyor. Kod, ürün kartındaki etiket numarası — ilan açıklamanıza yazın.
            </li>
            <li>
              <span className="font-medium text-ink">2.</span> Tarih aralığını yazıyor. Müsaitlik
              anında bu paneldeki takvimden kontrol ediliyor; dolu tarihler kabul edilmiyor.
            </li>
            <li>
              <span className="font-medium text-ink">3.</span> Ad, telefon ve il/ilçe bilgisini
              veriyor, özeti onaylıyor.
            </li>
            <li>
              <span className="font-medium text-ink">4.</span> Talep{" "}
              <Link href="/admin/talepler" className="link-underline text-accent">
                Talepler
              </Link>{" "}
              ekranınıza düşüyor. Siz onaylayana kadar hiçbir tarih kapanmıyor.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
