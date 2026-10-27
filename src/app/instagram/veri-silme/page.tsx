import Link from "next/link";
import type { Metadata } from "next";
import { IconCheckCircle } from "@/components/icons";

export const metadata: Metadata = {
  title: "Veri silme talebi · RentQR",
};

/**
 * Instagram'dan gelen veri silme talebinin durum sayfası. Meta, talebi
 * gönderen kişiye bu adresi ve takip kodunu gösteriyor. Silme talep anında
 * yapıldığı için sayfa her kod için aynı şeyi söylüyor.
 */
export default async function VeriSilmeDurumu({
  searchParams,
}: {
  searchParams: Promise<{ kod?: string }>;
}) {
  const { kod } = await searchParams;
  const temizKod = kod && /^[A-F0-9]{1,32}$/.test(kod) ? kod : null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-5 py-12">
      <div className="card w-full max-w-md space-y-4 p-6 text-center">
        <IconCheckCircle className="mx-auto h-10 w-10 text-success" />
        <h1 className="text-xl font-bold text-ink">Veri silme talebiniz tamamlandı</h1>
        <p className="text-sm leading-relaxed text-ink-muted">
          Instagram hesabınızın RentQR bağlantısı ve erişim anahtarı silindi. RentQR artık
          hesabınız adına mesaj okuyamaz ya da gönderemez.
        </p>
        {temizKod && (
          <p className="text-sm text-ink-muted">
            Takip kodu: <span className="font-mono font-semibold text-ink">{temizKod}</span>
          </p>
        )}
        <Link href="/gizlilik#veri-silme" className="link-underline text-sm text-accent">
          Gizlilik politikası
        </Link>
      </div>
    </main>
  );
}
