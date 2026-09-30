import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { ayarlariOku } from "@/lib/instagram/ayarlar";
import { asistanYapilandirildi } from "@/lib/instagram/sohbet";
import AsistanPaneli from "@/components/instagram/AsistanPaneli";
import { IconAlertTriangle } from "@/components/icons";

export const metadata: Metadata = {
  title: "Instagram paneli · RentQR",
};

export const dynamic = "force-dynamic";

/**
 * Satıcının Instagram asistanını kendisinin yönettiği ekran.
 *
 * Bağlantı ayrı ekranda (/admin/instagram) duruyor; burası "müşteriye ne
 * söylenecek" sorusunun yeri: karşılama, işletme bilgisi, kurallar, örnek
 * cevaplar, üslup. Asistan bu ekranda yazılanların dışına çıkmıyor.
 */
export default async function InstagramPaneliPage() {
  const [user, supabase] = await Promise.all([getCurrentUser(), createClient()]);

  const [{ data: satir }, { data: durum }] = await Promise.all([
    supabase
      .from("instagram_settings")
      .select("settings")
      .eq("owner_id", user?.id ?? "")
      .maybeSingle(),
    supabase.rpc("instagram_account_status"),
  ]);

  const bagli = ((durum ?? []) as { is_active: boolean }[])[0]?.is_active ?? false;

  return (
    <div className="flex flex-1 flex-col">
      <header className="page-header flex h-auto flex-col gap-1 border-b border-border bg-paper px-4 py-4 sm:h-20 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8 sm:py-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
            Instagram paneli
          </h1>
          <p className="text-sm text-ink-muted">
            Müşterilere ne yazılacağını, kuralları ve üslubu buradan yönetin.
          </p>
        </div>
        <Link href="/admin/instagram" className="btn btn-secondary self-start sm:self-auto">
          Bağlantı ayarları
        </Link>
      </header>

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 p-4 sm:p-8">
        {!bagli && (
          <p className="notice-warning flex items-start gap-2 text-sm">
            <IconAlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Instagram hesabınız bağlı değil. Ayarları şimdiden hazırlayabilirsiniz; mesajlara
              cevap verilmesi için{" "}
              <Link href="/admin/instagram" className="link-underline text-accent">
                hesabı bağlayın
              </Link>
              .
            </span>
          </p>
        )}

        <AsistanPaneli
          baslangic={ayarlariOku(satir?.settings)}
          asistanHazir={asistanYapilandirildi()}
          ownerId={user?.id ?? ""}
        />
      </div>
    </div>
  );
}
