"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ayarlariOku, type InstagramAyarlari } from "@/lib/instagram/ayarlar";
import { gorselOrnegiCoz, soruyaCevap } from "@/lib/instagram/sohbet";
import { PRODUCT_IMAGES_BUCKET, storagePathFromUrl } from "@/lib/storage";
import type { GecmisMesaj } from "@/lib/instagram/tipler";
import type { KatalogUrunu } from "@/lib/instagram/veri";

/**
 * Asistan ayarlarını kaydeder. Gelen değer istemciden geldiği için
 * `ayarlariOku` ile yeniden doğrulanıyor: uzunluk sınırları ve alan şekli
 * sunucuda kesinleşiyor. Yetkiyi `instagram_settings` politikaları veriyor.
 */
export async function ayarlariKaydet(
  ham: unknown
): Promise<{ hata: string | null; ayarlar?: InstagramAyarlari }> {
  const user = await getCurrentUser();
  if (!user) return { hata: "Oturumunuz sona ermiş. Lütfen tekrar giriş yapın." };

  const okunan = ayarlariOku(ham);
  // Görselli örnekler yalnızca satıcının kendi klasöründen olabilir.
  const ayarlar: InstagramAyarlari = {
    ...okunan,
    gorselOrnekler: okunan.gorselOrnekler.filter((o) => kendiGorseli(o.url, user.id)),
  };

  const supabase = await createClient();

  const { data: onceki } = await supabase
    .from("instagram_settings")
    .select("settings")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { error } = await supabase.from("instagram_settings").upsert({
    owner_id: user.id,
    settings: ayarlar,
    updated_at: new Date().toISOString(),
  });

  if (error) return { hata: error.message };

  // Listeden çıkarılan ekran görüntüleri kovadan da siliniyor: içlerinde
  // müşteri konuşmaları var, gereksiz yere durmasınlar.
  const kalan = new Set(ayarlar.gorselOrnekler.map((o) => o.url));
  const silinecek = ayarlariOku(onceki?.settings)
    .gorselOrnekler.filter((o) => !kalan.has(o.url) && kendiGorseli(o.url, user.id))
    .flatMap((o) => storagePathFromUrl(o.url) ?? []);

  if (silinecek.length) await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(silinecek);

  revalidatePath("/admin/instagram-paneli");
  return { hata: null, ayarlar };
}

function kendiGorseli(url: string, ownerId: string): boolean {
  return storagePathFromUrl(url)?.startsWith(`${ownerId}/instagram-ornek/`) ?? false;
}

const GORSEL_TURLERI = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Yüklenen ekran görüntüsündeki konuşmayı yazıya döker. Görsel tarayıcıdan
 * doğrudan kovaya yükleniyor (sunucu eylemlerinin gövde sınırı yüzünden);
 * burada kovadan okunup modele veriliyor.
 */
export async function gorselOrnegiOku(
  url: string
): Promise<{ dokum: string | null; hata: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { dokum: null, hata: "Oturumunuz sona ermiş." };

  const yol = storagePathFromUrl(url);
  if (!yol || !kendiGorseli(url, user.id)) return { dokum: null, hata: "Görsel bulunamadı." };

  const supabase = await createClient();
  const { data: dosya, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).download(yol);
  if (error || !dosya) return { dokum: null, hata: "Görsel okunamadı." };

  const tur = GORSEL_TURLERI.find((t) => t === dosya.type) ?? "image/jpeg";
  const veri = Buffer.from(await dosya.arrayBuffer()).toString("base64");

  const sonuc = await gorselOrnegiCoz(veri, tur);
  return "dokum" in sonuc ? { dokum: sonuc.dokum, hata: null } : { dokum: null, hata: sonuc.hata };
}

/**
 * Panelden deneme: satıcı bir müşteri mesajı yazıyor, asistanın o anki
 * (henüz kaydedilmemiş olabilecek) ayarlarla ne cevap vereceğini görüyor.
 * Katalog satıcının kendi oturumuyla, RLS altında okunuyor.
 */
export async function asistaniDene(
  hamAyarlar: unknown,
  gecmis: GecmisMesaj[],
  mesaj: string
): Promise<{ cevap: string | null; hata: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { cevap: null, hata: "Oturumunuz sona ermiş." };

  const metin = mesaj.trim().slice(0, 1000);
  if (!metin) return { cevap: null, hata: "Bir mesaj yazın." };

  const supabase = await createClient();
  const [{ data: urunler }, { data: hesap }] = await Promise.all([
    supabase
      .from("products")
      .select("name, barcode, description, daily_price, stock")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("instagram_account_status"),
  ]);

  const katalog: KatalogUrunu[] = (urunler ?? []).map((u) => ({
    kod: (u.barcode ?? null) as string | null,
    ad: u.name as string,
    aciklama: typeof u.description === "string" ? u.description.slice(0, 240) : null,
    gunlukFiyat: (u.daily_price ?? null) as number | null,
    stok: (u.stock ?? 0) as number,
  }));

  const kullaniciAdi =
    ((hesap ?? []) as { username: string | null }[])[0]?.username ?? null;

  const temizGecmis = (Array.isArray(gecmis) ? gecmis : [])
    .slice(-10)
    .map((m) => ({
      kim: m?.kim === "biz" ? ("biz" as const) : ("musteri" as const),
      metin: String(m?.metin ?? "").slice(0, 1000),
    }));

  const cevap = await soruyaCevap({
    ayarlar: ayarlariOku(hamAyarlar),
    katalog,
    isletmeAdi: kullaniciAdi,
    gecmis: temizGecmis,
    mesaj: metin,
    karsilamaGitti: false,
  });

  return cevap
    ? { cevap, hata: null }
    : { cevap: null, hata: "Asistan şu an cevap veremedi. Biraz sonra tekrar deneyin." };
}
