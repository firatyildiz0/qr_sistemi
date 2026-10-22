import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { greetingFor } from "@/lib/greeting";
import { displayStatus } from "@/lib/bookings";
import type { Booking } from "@/lib/types";
import HomeShortcuts from "@/components/admin/HomeShortcuts";
import BookingHistory, { type BookingHistoryRow } from "@/components/admin/BookingHistory";
import { coverImage } from "@/components/admin/ProductThumb";
import BugunKarti, { type Gun, type GunKiralama } from "@/components/admin/kapak/BugunKarti";
import Sayac from "@/components/admin/kapak/Sayac";
import Belir from "@/components/admin/kapak/Belir";

export const metadata: Metadata = {
  title: "Ana sayfa · RentQR",
};

type BookingWithProduct = Booking & {
  products: {
    id: string;
    name: string;
    owner_id: string;
    images: string[] | null;
  } | null;
};

const SERIT_GUN = 7;

// Sabit saat dilimi: sunucu UTC'de, satıcı İstanbul'da.
const tarihBasligi = new Intl.DateTimeFormat("tr-TR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Istanbul",
});
const kisaTarih = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", timeZone: "UTC" });

/**
 * `displayStatus` "bugün"ü `toISOString` ile buluyor; şerit ve özet de aynı
 * günü kullansın ki "bugün başlayan" bir kiralama listede "yaklaşan" kalmasın.
 */
function gunAnahtari(kaydir: number) {
  const gun = new Date();
  gun.setUTCDate(gun.getUTCDate() + kaydir);
  return gun.toISOString().slice(0, 10);
}

/**
 * Panelin ana sayfası, anasayfanın kapağıyla aynı dilde: iri bir selamlama,
 * altında günün tek cümlelik özeti ve yukarı sayan rakamlar. Hemen ardından
 * "Bugün" kartı — satıcının paneli açınca ilk bilmek istediği şey hangi
 * ürünün bugün çıkıp hangisinin döndüğü. Rezervasyon geçmişi en altta,
 * kaydırınca beliriyor.
 */
export default async function AdminHomePage() {
  const [user, profile, supabase] = await Promise.all([getCurrentUser(), getProfile(), createClient()]);
  const ownerId = user?.id ?? "";

  // Joining through products both scopes the rows to this owner and carries the
  // product name, so the list needs a single round trip.
  const [{ data, error }, { count: urunSayisi }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*, products!inner(id, name, owner_id, images)")
      .eq("products.owner_id", ownerId)
      .order("created_at", { ascending: false }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("owner_id", ownerId),
  ]);

  const rezervasyonlar = (data ?? []) as BookingWithProduct[];

  const bookings: BookingHistoryRow[] = rezervasyonlar.map((b) => ({
    id: b.id,
    productId: b.product_id,
    productName: b.products?.name ?? "Silinmiş ürün",
    productImageUrl: coverImage(b.products?.images),
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    startDate: b.start_date,
    endDate: b.end_date,
    status: displayStatus(b),
    createdAt: b.created_at,
  }));

  const haftaSonu = gunAnahtari(SERIT_GUN);
  const gecerli = rezervasyonlar.filter((b) => b.status !== "cancelled");

  const gunler: Gun[] = Array.from({ length: SERIT_GUN }, (_, i) => ({
    tarih: gunAnahtari(i),
    baslayan: [],
    biten: [],
  }));
  const gunBul = new Map(gunler.map((g) => [g.tarih, g]));

  let kirada = 0;
  let yaklasan = 0;
  let siradaki: string | null = null;

  for (const b of gecerli) {
    const kiralama: GunKiralama = {
      id: b.id,
      urunAdi: b.products?.name ?? "Silinmiş ürün",
      urunGorseli: coverImage(b.products?.images),
      musteri: b.customer_name,
    };
    gunBul.get(b.start_date)?.baslayan.push(kiralama);
    gunBul.get(b.end_date)?.biten.push(kiralama);

    const durum = displayStatus(b);
    if (durum === "active") kirada += 1;
    if (durum === "upcoming") {
      if (b.start_date < haftaSonu) yaklasan += 1;
      if (!siradaki || b.start_date < siradaki) siradaki = b.start_date;
    }
  }

  const ad = profile?.fullName?.split(" ")[0] ?? profile?.username ?? user?.email?.split("@")[0] ?? "";
  const selam = ad ? `${greetingFor()}, ${ad}.` : `${greetingFor()}.`;
  const ozet = gunOzeti(gunler[0], siradaki);

  const rakamlar = [
    { deger: urunSayisi ?? 0, etiket: "ürün" },
    { deger: kirada, etiket: "şu an kirada" },
    { deger: yaklasan, etiket: "7 gün içinde başlayacak" },
    { deger: gecerli.length, etiket: "toplam rezervasyon" },
  ];

  return (
    <div className="kapak flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 pb-16 pt-6 sm:gap-14 sm:px-8 sm:pt-12">
        {/* KAPAK — anasayfanın kahraman bölümüyle aynı ölçek ve aile. */}
        <section className="flex flex-col gap-6">
          <p className="kapak-giris m-0 text-sm font-bold uppercase tracking-[0.14em] text-accent" style={{ "--i": 0 } as React.CSSProperties}>
            {tarihBasligi.format(new Date())}
          </p>
          <h1 className="kapak-baslik m-0 text-[40px] font-extrabold leading-[0.98] text-balance text-ink sm:text-[60px] lg:text-[68px]">
            {selam.split(" ").map((kelime, i) => (
              <span key={i} className="kapak-kelime" style={{ "--i": i } as React.CSSProperties}>
                {kelime}{" "}
              </span>
            ))}
          </h1>
          <p
            className="kapak-giris m-0 max-w-[560px] text-lg leading-relaxed text-ink-muted sm:text-xl"
            style={{ "--i": 3 } as React.CSSProperties}
          >
            {ozet}
          </p>

          <dl
            className="kapak-giris m-0 mt-2 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-border pt-6 sm:grid-cols-4"
            style={{ "--i": 4 } as React.CSSProperties}
          >
            {rakamlar.map((r) => (
              <div key={r.etiket} className="kapak-rakam flex flex-col-reverse gap-0.5">
                <dt className="text-sm text-ink-muted">{r.etiket}</dt>
                <dd className="kapak-baslik m-0 text-[34px] font-extrabold leading-none text-ink sm:text-[40px]">
                  <Sayac hedef={r.deger} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="kapak-giris" style={{ "--i": 5 } as React.CSSProperties}>
          <BugunKarti gunler={gunler} />
        </div>

        <div className="kapak-giris" style={{ "--i": 6 } as React.CSSProperties}>
          <HomeShortcuts />
        </div>

        <Belir>
          <section>
            <h2 className="kapak-baslik mb-5 text-[28px] font-extrabold leading-none text-ink sm:text-[34px]">
              Rezervasyon geçmişi
            </h2>
            {error ? (
              <p className="text-sm text-danger">{error.message}</p>
            ) : (
              <BookingHistory bookings={bookings} />
            )}
          </section>
        </Belir>
      </div>
    </div>
  );
}

/** Kapaktaki tek cümle. Uydurma yok: yalnızca kayıtlardan sayılabilen şey. */
function gunOzeti(bugun: Gun, siradaki: string | null): string {
  const parcalar: string[] = [];
  if (bugun.baslayan.length) parcalar.push(`${bugun.baslayan.length} kiralama başlıyor`);
  if (bugun.biten.length) parcalar.push(`${bugun.biten.length} kiralama bitiyor`);
  if (parcalar.length) return `Bugün ${parcalar.join(", ")}.`;
  if (siradaki) return `Bugün sakin. Sıradaki kiralama ${kisaTarih.format(new Date(`${siradaki}T00:00:00Z`))} tarihinde başlıyor.`;
  return "Bugün sakin. Yaklaşan bir kiralama yok.";
}
