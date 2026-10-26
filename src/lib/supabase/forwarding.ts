/**
 * Supabase Auth'un hız sınırı ziyaretçinin IP'sine göre işliyor. Ama giriş,
 * kayıt ve oturum yenileme Supabase'e tarayıcıdan değil Vercel sunucusundan
 * gidiyor; Supabase bütün kullanıcıları Vercel'in birkaç çıkış adresinden
 * geliyor sanıyor. Sonuç: herkes aynı kotayı paylaşıyor (girişte 5 dakikada
 * 150 istek) ve birkaç adresten saldıran biri bu kotayı doldurup gerçek
 * kullanıcıların girişini durdurabiliyor.
 *
 * Supabase buna `sb-forwarded-for` başlığıyla izin veriyor: sunucu
 * ziyaretçinin asıl IP'sini iletiyor, sınır o adrese işliyor. Şartları:
 * istek yeni biçim gizli anahtarla (`sb_secret_…`) yapılmalı — eski
 * `service_role` JWT'si ve yayımlanabilir anahtar kabul edilmiyor — ve
 * Supabase panelinde Authentication > Rate Limits altında "IP Address
 * Forwarding" açık olmalı. Kapalıyken başlık yok sayılıyor, davranış eskisiyle
 * aynı kalıyor.
 *
 * DİKKAT: Gizli anahtar veritabanında RLS'yi atlıyor. Bu ayarlarla kurulan
 * istemci yalnızca `auth.*` çağrıları için; tabloya sorgu atmasın.
 */
export function authKeyAndHeaders(ip: string | null): {
  key: string;
  headers: Record<string, string>;
} {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Anahtar eski biçimdeyse ya da IP okunamadıysa iletecek bir şey yok;
  // yayımlanabilir anahtarla eskisi gibi devam.
  if (ip && secret?.startsWith("sb_secret_")) {
    return { key: secret, headers: { "sb-forwarded-for": ip } };
  }

  return { key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, headers: {} };
}

/** Vercel arkasında gerçek IP `x-forwarded-for`'un ilkidir; Vercel bu başlığı kendisi yazar. */
export function ipFromHeaders(list: Headers): string | null {
  return list.get("x-forwarded-for")?.split(",")[0]?.trim() || list.get("x-real-ip") || null;
}
