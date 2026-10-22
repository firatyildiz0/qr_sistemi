import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/bookings";
import { DELIVERY_MODE_LABEL, isDeliveryMode } from "@/lib/turnaround";

export const metadata: Metadata = {
  title: "Rezervasyon talebiniz",
  // Kodu bilen talebi görüyor; arama motorunun dizine alacağı bir sayfa değil.
  robots: { index: false, follow: false },
};

type Durum = {
  status: "pending" | "approved" | "rejected" | "expired";
  decision_note: string | null;
  start_date: string;
  end_date: string;
  delivery_mode: string;
  created_at: string;
  decided_at: string | null;
  urunler: { id: string; ad: string; adet: number }[];
};

const GORUNUM: Record<Durum["status"], { baslik: string; metin: string; renk: string }> = {
  pending: {
    baslik: "İşletmenin onayını bekliyor",
    metin: "Talebiniz işletmeye iletildi. Onaylandığında bu sayfada görünür; işletme gerekirse sizi telefonla arar.",
    renk: "bg-[color-mix(in_oklab,var(--color-status-upcoming)_14%,var(--color-card))] text-status-upcoming",
  },
  approved: {
    baslik: "Rezervasyonunuz onaylandı",
    metin: "Ürün seçtiğiniz tarihler için size ayrıldı. Teslim ayrıntıları için işletme sizinle iletişime geçecek.",
    renk: "bg-[color-mix(in_oklab,var(--color-success)_14%,var(--color-card))] text-success",
  },
  rejected: {
    baslik: "Talebiniz kabul edilmedi",
    metin: "İşletme bu tarihler için talebi onaylamadı. Başka tarih için ürünün sayfasından yeni talep gönderebilirsiniz.",
    renk: "bg-danger-soft text-danger",
  },
  expired: {
    baslik: "Talebin süresi doldu",
    metin: "Başlangıç tarihi geçtiği için talep kapandı. Başka tarih için ürünün sayfasından yeni talep gönderebilirsiniz.",
    renk: "bg-surface text-ink-muted",
  },
};

/**
 * Müşterinin QR talebini takip ettiği sayfa.
 *
 * Giriş istemiyor; adresteki kod anahtar. Kod 16 rastgele bayttan üretiliyor,
 * tahmin edilemez. Veritabanı fonksiyonu yalnızca durumu ve müşterinin zaten
 * bildiği ayrıntıları döndürüyor — telefon ve adres bu sayfaya hiç gelmiyor.
 */
export default async function TalepTakipSayfasi({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(kod)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("qr_talep_durumu", { p_kod: kod });
  const talep = (data as Durum[] | null)?.[0];
  if (!talep) notFound();

  const gorunum = GORUNUM[talep.status] ?? GORUNUM.pending;
  const kapandi = talep.status === "rejected" || talep.status === "expired";

  return (
    <main className="min-h-screen bg-paper px-4 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-5">
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">Rezervasyon talebiniz</h1>

        <div className={`rounded-[22px] p-5 ${gorunum.renk}`} role="status">
          <p className="text-lg font-extrabold">{gorunum.baslik}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">{gorunum.metin}</p>
          {talep.decision_note && (
            <p className="mt-3 rounded-xl bg-card px-3 py-2 text-sm text-ink">
              <span className="font-bold">İşletmenin notu:</span> {talep.decision_note}
            </p>
          )}
        </div>

        <dl className="card m-0 flex flex-col gap-4">
          <div>
            <dt className="text-xs font-bold text-ink-muted">Ürün</dt>
            {talep.urunler.map((urun) => (
              <dd key={urun.id} className="m-0 font-semibold text-ink">
                <Link href={`/product/${urun.id}`} className="link-underline">
                  {urun.ad}
                </Link>
                {urun.adet > 1 && <span className="text-ink-muted"> × {urun.adet}</span>}
              </dd>
            ))}
          </div>
          <div>
            <dt className="text-xs font-bold text-ink-muted">Tarihler</dt>
            <dd className="m-0 font-semibold text-ink">{formatDateRange(talep.start_date, talep.end_date)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-ink-muted">Teslim şekli</dt>
            <dd className="m-0 font-semibold text-ink">
              {isDeliveryMode(talep.delivery_mode) ? DELIVERY_MODE_LABEL[talep.delivery_mode] : talep.delivery_mode}
            </dd>
          </div>
        </dl>

        {!kapandi && (
          <p className="text-sm leading-relaxed text-ink-muted">
            Bu sayfanın adresini saklayın; durumu buradan takip edebilirsiniz. Sayfa en son durumu
            her açılışta gösterir.
          </p>
        )}

        <Link href={`/talep/${kod}`} className="btn btn-secondary self-start">
          Durumu yenile
        </Link>
      </div>
    </main>
  );
}
