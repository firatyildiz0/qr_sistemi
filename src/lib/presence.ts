import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashPepper } from "@/lib/pepper";

/**
 * Anlık etkin kullanıcı sayısı.
 *
 * Ölçü şu: son iki dakikada sunucuya "buradayım" diyen ayrı anahtar sayısı.
 * Kalp atışını açık sekmeler gönderiyor (bkz. components/PresenceBeacon.tsx),
 * sayfa gezinmesi beklenmiyor — biri tek bir ürün sayfasında on dakika dursa da
 * sayılmaya devam ediyor.
 */

export type PresenceKind = "panel" | "urun";

export type Presence = {
  /** Satıcı panelinde olanlar. */
  panel: number;
  /** Herkese açık ürün sayfasında olanlar. */
  urun: number;
  total: number;
};

export const EMPTY_PRESENCE: Presence = { panel: 0, urun: 0, total: 0 };

export function isPresenceKind(value: unknown): value is PresenceKind {
  return value === "panel" || value === "urun";
}

/**
 * Kişiyi değil sekmeyi ayırt eden anahtar.
 *
 * Giriş yapmış satıcı için kullanıcı kimliği; ziyaretçi için IP'nin tuzlanmış
 * özeti. Bilerek user-agent'ı içermiyor: tarayıcı bilgisini değiştirerek sayıyı
 * şişirmek mümkün olmasın diye. Bedeli, aynı ağın arkasındaki iki ziyaretçinin
 * tek kişi sayılması — anlık bir sayaç için kabul edilebilir bir hata.
 */
export function presenceKey(userId: string | null, ip: string | null): string | null {
  if (userId) return `u:${userId}`;
  if (!ip) return null;

  const hash = createHash("sha256")
    .update(`${ip}|${hashPepper()}`)
    .digest("hex");

  return `v:${hash}`;
}

/**
 * Kalp atışını kaydeder. Service role ile, çünkü tabloda yazma politikası yok:
 * sayaç tarayıcıdaki anon anahtarla şişirilemesin.
 */
export async function touchPresence(key: string, kind: PresenceKind): Promise<void> {
  try {
    await createAdminClient().rpc("touch_presence", { p_key: key, p_kind: kind });
  } catch (error) {
    console.error("[presence] kalp atışı kaydedilemedi:", error);
  }
}

/**
 * Panelin gördüğü sayı. Oturumun kendi anahtarıyla okunuyor: fonksiyon
 * `security definer` ve içinde `is_superuser()` kontrolü var.
 *
 * Hata durumunda sıfır dönüyor — en olası hâli 0020 göçünün henüz
 * çalıştırılmamış olması, ve bu kart yüzünden sayfanın tamamı bozulmasın.
 */
export async function getPresence(): Promise<Presence> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_presence");

  if (error) return EMPTY_PRESENCE;

  const rows = (data ?? []) as { kind: PresenceKind; viewers: number }[];
  const panel = Number(rows.find((r) => r.kind === "panel")?.viewers ?? 0);
  const urun = Number(rows.find((r) => r.kind === "urun")?.viewers ?? 0);

  return { panel, urun, total: panel + urun };
}
