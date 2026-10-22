"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  bookedCountByDate,
  computeOccupancySpan,
  firstSoldOutDate,
  formatDateRange,
} from "@/lib/bookings";
import { readAddress, readDeliveryMode, validateDates } from "@/lib/rezervasyon-formu";
import { getTurnaroundForOwner } from "@/lib/settings";
import { checkQrTalepRateLimit, recordSecurityEvent } from "@/lib/security";

export type TalepFormDurumu = { hata: string | null };

const MAX_AD_UZUNLUGU = 80;

/** Bugünün tarihi Türkiye saatiyle: gece yarısından sonra sunucu UTC'de dünde kalmasın. */
function bugun(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" }).format(new Date());
}

/**
 * Türkiye cep ya da sabit hat numarası, `05xxxxxxxxx` biçimine getirilmiş.
 * Müşteri boşluklu, parantezli, +90'lı yazabilir; satıcı panelde hep aynı
 * biçimi görsün ve aynı numaradan ikinci talep yakalanabilsin diye tek biçim.
 */
function telefonuOku(ham: string): string | null {
  let rakamlar = ham.replace(/\D/g, "");
  if (rakamlar.startsWith("90") && rakamlar.length === 12) rakamlar = rakamlar.slice(2);
  if (rakamlar.length === 10) rakamlar = `0${rakamlar}`;
  return /^0[2-5]\d{9}$/.test(rakamlar) ? rakamlar : null;
}

/**
 * Müşterinin QR sayfasından bıraktığı rezervasyon talebi.
 *
 * Ziyaretçinin oturumu yok, o yüzden yazma service role ile yapılıyor ve her
 * kural burada: hız sınırı, ürünün ve satıcının geçerliliği, tarihlerin
 * geçmişte olmaması, ürünün o günlerde gerçekten müsait olması ve aynı
 * telefondan aynı ürüne ikinci bir bekleyen talep açılmaması. Talep takvimi
 * kapatmıyor; satıcı Talepler ekranında onaylayınca rezervasyon açılıyor ve
 * stok o anda yine veritabanında denetleniyor.
 *
 * Başarıda müşteri takip sayfasına yönleniyor. Kod tahmin edilemez; sayfayı
 * açan, talebin durumunu görüyor — telefon ve adresi değil.
 */
export async function talepGonder(
  productId: string,
  _onceki: TalepFormDurumu,
  formData: FormData
): Promise<TalepFormDurumu> {
  const ad = String(formData.get("customer_name") ?? "").trim();
  const telefon = telefonuOku(String(formData.get("customer_phone") ?? ""));
  const baslangic = String(formData.get("start_date") ?? "");
  const bitis = String(formData.get("end_date") ?? "");

  if (!ad) return { hata: "Adınızı yazın." };
  if (ad.length > MAX_AD_UZUNLUGU) return { hata: `Ad en fazla ${MAX_AD_UZUNLUGU} karakter olabilir.` };
  if (!telefon) return { hata: "Geçerli bir telefon numarası yazın, örneğin 0532 123 45 67." };
  if (formData.get("onay") !== "on") {
    return { hata: "Bilgilerinizin işletmeyle paylaşılmasını onaylamanız gerekiyor." };
  }

  const tarihHatasi = validateDates(baslangic, bitis);
  if (tarihHatasi) return { hata: tarihHatasi };
  if (baslangic < bugun()) return { hata: "Geçmiş bir tarih seçilemez." };

  const adres = readAddress(formData);
  if ("error" in adres) return { hata: adres.error };

  const sinir = await checkQrTalepRateLimit();
  if (!sinir.allowed) return { hata: sinir.message };

  const db = createAdminClient();

  const { data: urun } = await db
    .from("products")
    .select("id, name, stock, owner_id")
    .eq("id", productId)
    .maybeSingle();

  if (!urun) return { hata: "Ürün bulunamadı." };
  if ((urun.stock as number) <= 0) return { hata: "Bu ürün şu an stokta yok." };

  // Onayı kaldırılmış ya da hiç onaylanmamış bir hesabın ürünü talep almasın:
  // talebi onaylayacak bir panel yok.
  const { data: satici } = await db
    .from("profiles")
    .select("status")
    .eq("id", urun.owner_id)
    .maybeSingle();

  if (satici?.status !== "approved") {
    return { hata: "Bu ürün için şu an talep alınmıyor. İşletmeyle doğrudan iletişime geçin." };
  }

  const ownerId = urun.owner_id as string;
  const teslim = readDeliveryMode(formData, adres.values.customer_city);
  const turnaround = await getTurnaroundForOwner(db, ownerId);
  const bloke = computeOccupancySpan(baslangic, bitis, teslim, turnaround);

  // Müşterinin takvimi zaten dolu günleri kapatıyor; bu kontrol arada açılmış
  // bir rezervasyona ve elle atılan isteğe karşı. Hazırlık ve kargo günleri de
  // sayılıyor: ürün kiralama başlamadan çıkıyor, döndükten sonra hazırlanıyor.
  const { data: dolu, error: doluHatasi } = await db
    .from("bookings")
    .select("start_date, end_date, blocked_start, blocked_end")
    .eq("product_id", productId)
    .neq("status", "cancelled")
    .gte("blocked_end", bloke.start_date)
    .lte("blocked_start", bloke.end_date);

  if (doluHatasi) return { hata: "Müsaitlik kontrol edilemedi. Biraz sonra tekrar deneyin." };

  const doluGun = firstSoldOutDate(
    bookedCountByDate(
      (dolu ?? []).map((satir) => ({
        start_date: (satir.blocked_start ?? satir.start_date) as string,
        end_date: (satir.blocked_end ?? satir.end_date) as string,
      }))
    ),
    urun.stock as number,
    bloke.start_date,
    bloke.end_date,
    1
  );

  if (doluGun) {
    return {
      hata: `Ürün ${formatDateRange(doluGun, doluGun)} tarihinde müsait değil (teslim ve hazırlık günleri dahil). Başka tarih seçin.`,
    };
  }

  const { data: bekleyen } = await db
    .from("booking_requests")
    .select("id, booking_request_items!inner(product_id)")
    .eq("owner_id", ownerId)
    .eq("source", "qr")
    .eq("status", "pending")
    .eq("customer_phone", telefon)
    .eq("booking_request_items.product_id", productId)
    .limit(1);

  if (bekleyen && bekleyen.length > 0) {
    return { hata: "Bu ürün için bekleyen bir talebiniz zaten var. İşletmenin yanıtını bekleyin." };
  }

  const takipKodu = randomBytes(16).toString("base64url");

  const { data: talep, error: talepHatasi } = await db
    .from("booking_requests")
    .insert({
      owner_id: ownerId,
      source: "qr",
      takip_kodu: takipKodu,
      customer_name: ad,
      customer_phone: telefon,
      ...adres.values,
      start_date: baslangic,
      end_date: bitis,
      delivery_mode: teslim,
      blocked_start: bloke.start_date,
      blocked_end: bloke.end_date,
    })
    .select("id")
    .single();

  if (talepHatasi || !talep) {
    console.error("[talep] kaydedilemedi:", talepHatasi);
    return { hata: "Talebiniz kaydedilemedi. Biraz sonra tekrar deneyin." };
  }

  const talepId = talep.id as string;

  // Kalem ve bildirim talebin parçası: biri düşmezse talep de geri alınıyor.
  // Satıcının haberi olmayan bir talep, müşteriyi boşuna bekletirdi.
  const { error: kalemHatasi } = await db
    .from("booking_request_items")
    .insert({ request_id: talepId, product_id: productId, quantity: 1 });

  const { error: bildirimHatasi } = kalemHatasi
    ? { error: kalemHatasi }
    : await db.from("notifications").insert({
        owner_id: ownerId,
        kind: "talep",
        request_id: talepId,
        product_id: productId,
        message: `${ad}, ${urun.name as string} için QR etiketten rezervasyon talebi gönderdi.`,
      });

  if (kalemHatasi || bildirimHatasi) {
    console.error("[talep] kalem ya da bildirim yazılamadı:", kalemHatasi ?? bildirimHatasi);
    await db.from("booking_requests").delete().eq("id", talepId);
    return { hata: "Talebiniz kaydedilemedi. Biraz sonra tekrar deneyin." };
  }

  // Hız sınırının saydığı kayıt. Müşterinin adı ya da telefonu buraya yazılmıyor.
  await recordSecurityEvent({ kind: "qr_talep", detail: { productId } });

  revalidatePath("/admin/talepler");
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");

  redirect(`/talep/${takipKodu}`);
}
