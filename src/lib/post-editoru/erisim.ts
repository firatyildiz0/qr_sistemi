import { getProfile } from "@/lib/profile";
import { createAdminClient } from "@/lib/supabase/admin";

/** Editördeki kişi: imleçte ve üst çubukta görünen ad ve renk. */
export type EditorKullanicisi = { id: string; name: string; color: string };

// Profilinde renk seçmemiş biri için: aynı kişi her açılışta aynı rengi alsın.
const RENKLER = ["#d11414", "#1f6fd1", "#1f8a4c", "#c77d12", "#7b3fd1", "#0f8a8a"];

/**
 * Editör onaylı superuser'a ve `post_editoru_erisim` listesindeki onaylı
 * hesaplara açık (0034: Nihat'ın iki hesabı). Listedekiler satıcı; yönetim
 * panelinin geri kalanını göremiyorlar, yalnızca editörü. Kimliği anon
 * anahtarla okuyor; tablolara yazma service role ile.
 */
export async function editorKullanicisi(): Promise<EditorKullanicisi | null> {
  const me = await getProfile();
  if (!me || me.status !== "approved") return null;
  if (me.role !== "superuser" && !(await editorUyesi(me.id))) return null;

  const name = me.fullName?.trim().split(/\s+/)[0] || me.username;
  const hash = [...me.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const color = /^#[0-9a-f]{6}$/i.test(me.avatarColor ?? "") ? me.avatarColor! : RENKLER[hash % RENKLER.length];
  return { id: me.id, name, color };
}

export const db = () => createAdminClient();

/** Superuser olmadığı hâlde editöre girebilen hesap mı? Satıcı panelindeki bağlantı da buna bakıyor. */
export async function editorUyesi(kullanici: string): Promise<boolean> {
  const { data } = await db().from("post_editoru_erisim").select("kullanici").eq("kullanici", kullanici).maybeSingle();
  return !!data;
}

export async function ayarOku<T>(anahtar: string, varsayilan: T): Promise<T> {
  const { data, error } = await db().from("post_editoru_ayarlar").select("deger").eq("anahtar", anahtar).maybeSingle();
  if (error) throw new Error(`Ayar okunamadı: ${error.message}`);
  return (data?.deger as T) ?? varsayilan;
}

export async function ayarYaz(anahtar: string, deger: unknown): Promise<void> {
  const { error } = await db()
    .from("post_editoru_ayarlar")
    .upsert({ anahtar, deger, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Ayar kaydedilemedi: ${error.message}`);
}
