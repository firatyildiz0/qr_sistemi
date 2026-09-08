import { createAdminClient } from "@/lib/supabase/admin";
import {
  addDays,
  bookedCountByDate,
  computeOccupancySpan,
  firstSoldOutDate,
  type DateSpan,
} from "@/lib/bookings";
import {
  DELIVERY_MODES,
  deliveryModeForCity,
  parseTurnaround,
  tailDays,
  type DeliveryMode,
  type Turnaround,
} from "@/lib/turnaround";
import {
  adimMi,
  BOS_TASLAK,
  type BagliHesap,
  type Konusma,
  type Taslak,
  type TaslakUrun,
  type TalepAraligi,
} from "@/lib/instagram/tipler";

/**
 * Instagram akışının veritabanı yüzü.
 *
 * Buradaki her sorgu service role anahtarıyla çalışıyor, yani RLS devre dışı —
 * başka türlü olamazdı, çünkü karşıda oturum açmış bir satıcı değil, mesaj
 * yazan bir müşteri var. Yetkiyi RLS yerine bu dosya taşıyor: her sorgu
 * webhook'un çözdüğü `ownerId` ile sınırlı, hiçbir fonksiyon satıcı kimliği
 * olmadan çağrılamıyor. Dosyanın dışına çıplak bir sorgu sızmasın diye de
 * uygulamanın geri kalanı buraya değil, bu fonksiyonlara bakıyor.
 */

type Admin = ReturnType<typeof createAdminClient>;

export function adminIstemci(): Admin {
  return createAdminClient();
}

/** Webhook'taki hesap kimliğinden satıcıyı bulur. */
export async function hesapBul(
  db: Admin,
  igUserId: string
): Promise<BagliHesap | null> {
  const { data } = await db
    .from("instagram_accounts")
    .select("owner_id, ig_user_id, access_token, username, is_active")
    .eq("ig_user_id", igUserId)
    .maybeSingle();

  if (!data || !data.is_active) return null;

  return {
    ownerId: data.owner_id as string,
    igUserId: data.ig_user_id as string,
    accessToken: data.access_token as string,
    username: (data.username ?? null) as string | null,
  };
}

/**
 * Aynı olayın ikinci teslimatı mı.
 *
 * Meta 20 saniyede 200 alamazsa olayı tekrar gönderiyor; ağ yavaşladığında
 * aynı mesaj iki kez işlenip müşteriye iki cevap gider, kötü ihtimalle iki
 * talep açılırdı. `mid` birincil anahtar olduğu için ikinci ekleme çakışıyor
 * ve `false` dönüyor.
 */
export async function olayYeni(db: Admin, mid: string): Promise<boolean> {
  const { error } = await db.from("instagram_events").insert({ mid });

  // 23505 = unique_violation: olay zaten işlenmiş.
  if (error?.code === "23505") return false;
  if (error) throw new Error(error.message);
  return true;
}

function taslakOku(ham: unknown): Taslak {
  if (typeof ham !== "object" || ham === null) return { ...BOS_TASLAK };
  const veri = ham as Record<string, unknown>;

  const urunler: TaslakUrun[] = Array.isArray(veri.urunler)
    ? veri.urunler.flatMap((urun) => {
        if (typeof urun !== "object" || urun === null) return [];
        const u = urun as Record<string, unknown>;
        if (typeof u.id !== "string" || typeof u.ad !== "string") return [];
        return [
          {
            id: u.id,
            kod: typeof u.kod === "string" ? u.kod : "",
            ad: u.ad,
            adet: Number(u.adet) > 0 ? Math.trunc(Number(u.adet)) : 1,
            stok: Number(u.stok) > 0 ? Math.trunc(Number(u.stok)) : 0,
            gunlukFiyat:
              typeof u.gunlukFiyat === "number" && Number.isFinite(u.gunlukFiyat)
                ? u.gunlukFiyat
                : null,
          },
        ];
      })
    : [];

  const metin = (deger: unknown) =>
    typeof deger === "string" && deger.trim() ? deger : undefined;

  return {
    urunler,
    baslangic: metin(veri.baslangic),
    bitis: metin(veri.bitis),
    ad: metin(veri.ad),
    telefon: typeof veri.telefon === "string" ? veri.telefon : null,
    il: metin(veri.il),
    ilce: metin(veri.ilce),
  };
}

/**
 * Konuşmayı açar ya da bulur.
 *
 * `upsert` değil `select` + `insert`: yeni bir konuşma açıldığında karşılama
 * mesajı gönderilmesi gerekiyor ve bunu ancak satırın gerçekten yeni olduğunu
 * bilerek yapabiliriz. Yarış durumunda (aynı anda iki mesaj) ikinci ekleme
 * çakışıyor, orada da mevcut satır okunuyor.
 */
export async function konusmaBul(
  db: Admin,
  hesap: BagliHesap,
  senderId: string
): Promise<{ konusma: Konusma; yeni: boolean }> {
  const oku = async () => {
    const { data } = await db
      .from("instagram_threads")
      .select("id, owner_id, ig_user_id, sender_id, state, draft, updated_at")
      .eq("ig_user_id", hesap.igUserId)
      .eq("sender_id", senderId)
      .maybeSingle();
    return data;
  };

  const cevir = (satir: Record<string, unknown>): Konusma => ({
    id: satir.id as string,
    ownerId: satir.owner_id as string,
    igUserId: satir.ig_user_id as string,
    senderId: satir.sender_id as string,
    adim: adimMi(satir.state) ? satir.state : "kod",
    taslak: taslakOku(satir.draft),
    updatedAt: satir.updated_at as string,
  });

  const mevcut = await oku();
  if (mevcut) return { konusma: cevir(mevcut), yeni: false };

  const { data: eklenen, error } = await db
    .from("instagram_threads")
    .insert({
      owner_id: hesap.ownerId,
      ig_user_id: hesap.igUserId,
      sender_id: senderId,
      state: "kod",
      draft: BOS_TASLAK,
    })
    .select("id, owner_id, ig_user_id, sender_id, state, draft, updated_at")
    .single();

  if (eklenen) return { konusma: cevir(eklenen), yeni: true };

  // Aynı anda gelen ikinci mesaj satırı bizden önce açmış olabilir.
  if (error?.code === "23505") {
    const tekrar = await oku();
    if (tekrar) return { konusma: cevir(tekrar), yeni: false };
  }

  throw new Error(error?.message ?? "Konuşma açılamadı.");
}

/**
 * Konuşmanın yeni durumunu yazar — ama yalnızca okuduğumuzdan beri kimse
 * değiştirmediyse.
 *
 * Müşteri iki mesajı arka arkaya yollarsa webhook ikisini ayrı isteklerde
 * teslim edebiliyor ve ikisi de aynı satırı yazacak. Sürüm kontrolü olmasaydı
 * geç biten istek erken bitenin ilerlemesini geri alırdı: müşteri tarihi
 * yazmış ama sohbet hâlâ tarih soruyor olurdu. `false` dönerse çağıran taraf
 * durumu yeniden okuyup mesajı yeniden değerlendiriyor.
 */
export async function konusmaYaz(
  db: Admin,
  konusma: Konusma,
  adim: string,
  taslak: Taslak
): Promise<boolean> {
  const { data } = await db
    .from("instagram_threads")
    .update({
      state: adim,
      draft: taslak,
      updated_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .eq("id", konusma.id)
    .eq("updated_at", konusma.updatedAt)
    .select("id");

  return (data ?? []).length > 0;
}

/**
 * Ürün kodundan ürün. Kod satıcı içinde tekil (bkz. `products_owner_barcode_key`)
 * ve karşılaştırma harf duyarsız: müşteri "a-14" da yazabilir "A-14" de.
 */
export async function urunBul(
  db: Admin,
  ownerId: string,
  kod: string
): Promise<TaslakUrun | null> {
  const { data } = await db
    .from("products")
    .select("id, name, stock, daily_price, barcode")
    .eq("owner_id", ownerId)
    .ilike("barcode", kod)
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id as string,
    kod: (data.barcode ?? kod) as string,
    ad: data.name as string,
    adet: 1,
    stok: (data.stock ?? 0) as number,
    gunlukFiyat: (data.daily_price ?? null) as number | null,
  };
}

/** Satıcının teslimat süreleri; talebin bloke aralığı bundan çıkıyor. */
export async function surelerOku(db: Admin, ownerId: string): Promise<Turnaround> {
  const { data } = await db
    .from("rental_settings")
    .select("turnaround")
    .eq("owner_id", ownerId)
    .maybeSingle();

  return parseTurnaround(data?.turnaround);
}

/**
 * Teslimat şekli daha bilinmiyorken kullanılan, iki şeklin de en genişi olan
 * aralık.
 *
 * Sohbette tarih ilden önce soruluyor (müşteri için doğal sıra bu), oysa ürünün
 * kaç gün kapanacağı teslimat şekline bağlı. Burada kasıtlı olarak kötümser
 * davranılıyor: müsaitlik en uzun aralığa göre kontrol ediliyor, yani müşteriye
 * "boş" denip sonra "aslında dolu" denmesi mümkün değil. Tersi olabilir —
 * elden teslimde aslında boş olan bir gün burada dolu görünebilir — ama yanlış
 * yönü bu: satıcı reddedilmiş bir talebi görmez, sözü tutulmamış bir müşteriyi
 * görür.
 */
export function enGenisAralik(
  baslangic: string,
  bitis: string,
  sureler: Turnaround
): DateSpan {
  const oncesi = Math.max(...DELIVERY_MODES.map((mod) => sureler[mod].outbound));
  const sonrasi = Math.max(...DELIVERY_MODES.map((mod) => tailDays(sureler[mod])));

  return {
    start_date: addDays(baslangic, -oncesi),
    end_date: addDays(bitis, sonrasi),
  };
}

/** İl belli olduğunda talebin gerçek aralığı. */
export function talepAraligi(
  baslangic: string,
  bitis: string,
  il: string,
  sureler: Turnaround
): TalepAraligi {
  const deliveryMode: DeliveryMode = deliveryModeForCity(il);
  const span = computeOccupancySpan(baslangic, bitis, deliveryMode, sureler);

  return {
    deliveryMode,
    blockedStart: span.start_date,
    blockedEnd: span.end_date,
  };
}

export type Cakisma = { urun: TaslakUrun; gun: string };

/**
 * İstenen aralıkta müsait olmayan ilk ürün.
 *
 * Sayım `bookings` üzerinden yapılıyor — panelin, ürün sayfasının ve stok
 * trigger'ının baktığı aynı satırlar. Yani sohbette görünen müsaitlik ile
 * sitedeki takvim aynı kaynaktan besleniyor; ikisi arasında kayma olabilecek
 * bir ara kopya yok. Onay bekleyen talepler bilerek sayılmıyor: gün kapatan
 * şey rezervasyon, talep değil.
 */
export async function cakismaBul(
  db: Admin,
  urunler: TaslakUrun[],
  span: DateSpan
): Promise<Cakisma | null> {
  if (urunler.length === 0) return null;

  const { data, error } = await db
    .from("bookings")
    .select("product_id, blocked_start, blocked_end, start_date, end_date")
    .in(
      "product_id",
      urunler.map((urun) => urun.id)
    )
    .neq("status", "cancelled")
    .gte("blocked_end", span.start_date)
    .lte("blocked_start", span.end_date);

  if (error) throw new Error(error.message);

  for (const urun of urunler) {
    if (urun.stok <= 0) {
      return { urun, gun: span.start_date };
    }

    const sayim = bookedCountByDate(
      (data ?? [])
        .filter((satir) => satir.product_id === urun.id)
        .map((satir) => ({
          start_date: (satir.blocked_start ?? satir.start_date) as string,
          end_date: (satir.blocked_end ?? satir.end_date) as string,
        }))
    );

    const dolu = firstSoldOutDate(
      sayim,
      urun.stok,
      span.start_date,
      span.end_date,
      urun.adet
    );

    if (dolu) return { urun, gun: dolu };
  }

  return null;
}

/**
 * Talebi ve bildirimini açar.
 *
 * İkisi tek çağrıda: talep açılıp bildirimi düşmezse satıcı hiç haberi olmadan
 * müşteriyi bekletirdi. Bildirim başarısız olursa talep de geri alınıyor,
 * müşteriye de "iletemedik" deniyor — yarım kalmış bir söz vermektense
 * tekrar denemesini istemek daha dürüst.
 */
export async function talepOlustur(
  db: Admin,
  girdi: {
    ownerId: string;
    threadId: string;
    senderId: string;
    taslak: Taslak;
    aralik: TalepAraligi;
  }
): Promise<{ id: string } | { hata: string }> {
  const { taslak, aralik } = girdi;

  if (!taslak.baslangic || !taslak.bitis || !taslak.ad || !taslak.il || !taslak.ilce) {
    return { hata: "Talep için eksik bilgi var." };
  }

  const { data: talep, error } = await db
    .from("booking_requests")
    .insert({
      owner_id: girdi.ownerId,
      source: "instagram",
      thread_id: girdi.threadId,
      sender_id: girdi.senderId,
      customer_name: taslak.ad,
      customer_phone: taslak.telefon ?? null,
      customer_city: taslak.il,
      customer_district: taslak.ilce,
      start_date: taslak.baslangic,
      end_date: taslak.bitis,
      delivery_mode: aralik.deliveryMode,
      blocked_start: aralik.blockedStart,
      blocked_end: aralik.blockedEnd,
    })
    .select("id")
    .single();

  if (error || !talep) {
    return { hata: error?.message ?? "Talep kaydedilemedi." };
  }

  const talepId = talep.id as string;

  const { error: kalemHatasi } = await db.from("booking_request_items").insert(
    taslak.urunler.map((urun) => ({
      request_id: talepId,
      product_id: urun.id,
      quantity: urun.adet,
    }))
  );

  if (kalemHatasi) {
    await db.from("booking_requests").delete().eq("id", talepId);
    return { hata: kalemHatasi.message };
  }

  const urunOzeti = taslak.urunler
    .map((urun) => (urun.adet > 1 ? `${urun.ad} (${urun.adet} adet)` : urun.ad))
    .join(", ");

  const { error: bildirimHatasi } = await db.from("notifications").insert({
    owner_id: girdi.ownerId,
    kind: "talep",
    request_id: talepId,
    // Tek ürünlü talepte bildirimi ürüne bağlıyoruz; çok ürünlüde tek bir ürüne
    // bağlamak yanıltıcı olurdu, o yüzden boş kalıyor.
    product_id: taslak.urunler.length === 1 ? taslak.urunler[0].id : null,
    message: `${taslak.ad} Instagram'dan rezervasyon talebi gönderdi: ${urunOzeti}.`,
  });

  if (bildirimHatasi) {
    await db.from("booking_requests").delete().eq("id", talepId);
    return { hata: bildirimHatasi.message };
  }

  return { id: talepId };
}
