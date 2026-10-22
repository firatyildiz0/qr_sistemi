import { ayarOku, ayarYaz, db, type EditorKullanicisi } from "./erisim";
import { durumOf } from "./ops";

/**
 * Editörün Canva'daki karşılıkları: marka kiti, kayıtlı şablonlar, postlara
 * yorum ve sürüm geçmişi. Hepsi iki kişilik ekibin ortak verisi.
 */

export class TasarimHata extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const renk = (v: unknown) => (typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : null);

/* ---------- marka kiti ---------- */
export type Marka = { colors: string[]; logos: { src: string; name: string }[]; fonts: { baslik: string | null; metin: string | null } };
const BOS_MARKA: Marka = { colors: ["#d11414", "#140504", "#ffffff"], logos: [], fonts: { baslik: null, metin: null } };

export const markaOku = () => ayarOku<Marka>("marka", BOS_MARKA);

export async function markaYaz(body: Record<string, unknown>): Promise<Marka> {
  const font = (v: unknown) => (typeof v === "string" && /^[A-Za-z ]{2,40}$/.test(v) ? v : null);
  const m: Marka = {
    colors: [...new Set((Array.isArray(body.colors) ? body.colors : []).map(renk).filter((c): c is string => !!c))].slice(0, 24),
    logos: (Array.isArray(body.logos) ? body.logos : [])
      .filter((l): l is Record<string, unknown> => isRec(l) && typeof l.src === "string")
      .slice(0, 24)
      .map((l) => ({ src: String(l.src).slice(0, 500), name: String(l.name || "Logo").slice(0, 60) })),
    fonts: { baslik: font(isRec(body.fonts) ? body.fonts.baslik : null), metin: font(isRec(body.fonts) ? body.fonts.metin : null) },
  };
  await ayarYaz("marka", m);
  return m;
}

/* ---------- şablonlar ---------- */
export async function sablonlar() {
  const { data, error } = await db().from("post_editoru_sablonlar").select("id, ad, post, kim, created_at").order("created_at", { ascending: false });
  if (error) throw new Error(`Şablonlar okunamadı: ${error.message}`);
  return data;
}

export async function sablonKaydet(me: EditorKullanicisi, body: Record<string, unknown>) {
  const ad = String(body.ad || "").trim().slice(0, 80);
  if (!ad) throw new TasarimHata("Şablona bir ad ver.");
  if (!isRec(body.post) || JSON.stringify(body.post).length > 400_000) throw new TasarimHata("Geçersiz post.");
  const id = "s" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const { error } = await db().from("post_editoru_sablonlar").insert({ id, ad, post: body.post, kim: me.name });
  if (error) throw new Error(`Şablon kaydedilemedi: ${error.message}`);
  return { id };
}

export async function sablonSil(id: string) {
  const { error } = await db().from("post_editoru_sablonlar").delete().eq("id", id);
  if (error) throw new Error(`Şablon silinemedi: ${error.message}`);
}

/* ---------- yorumlar ---------- */
export async function yorumlar(postId: string | null) {
  let q = db().from("post_editoru_yorumlar").select("id, post_id, kullanici, ad, renk, metin, cozuldu, created_at").order("created_at");
  if (postId) q = q.eq("post_id", postId);
  else q = q.eq("cozuldu", false);
  const { data, error } = await q.limit(500);
  if (error) throw new Error(`Yorumlar okunamadı: ${error.message}`);
  return data;
}

export async function yorumYaz(me: EditorKullanicisi, body: Record<string, unknown>) {
  const postId = String(body.post || "");
  const metin = String(body.metin || "").trim().slice(0, 2000);
  if (!/^[a-z0-9]{3,40}$/i.test(postId)) throw new TasarimHata("Geçersiz post.");
  if (!metin) throw new TasarimHata("Yorum boş olamaz.");
  const { error } = await db().from("post_editoru_yorumlar").insert({ post_id: postId, kullanici: me.id, ad: me.name, renk: me.color, metin });
  if (error) throw new Error(`Yorum kaydedilemedi: ${error.message}`);
}

export async function yorumGuncelle(me: EditorKullanicisi, body: Record<string, unknown>) {
  const id = Number(body.id);
  if (!Number.isInteger(id)) throw new TasarimHata("Geçersiz yorum.");
  if (body.sil === true) {
    // yalnızca kendi yorumunu siler; çözmek herkese açık
    const { error } = await db().from("post_editoru_yorumlar").delete().eq("id", id).eq("kullanici", me.id);
    if (error) throw new Error(`Yorum silinemedi: ${error.message}`);
    return;
  }
  const { error } = await db().from("post_editoru_yorumlar").update({ cozuldu: body.cozuldu === true }).eq("id", id);
  if (error) throw new Error(`Yorum güncellenemedi: ${error.message}`);
}

/* ---------- sürüm geçmişi ---------- */
export async function surumler() {
  const { data, error } = await db()
    .from("post_editoru_surumler")
    .select("id, rev, kim, created_at")
    .order("created_at", { ascending: false })
    .limit(60);
  if (error) throw new Error(`Sürümler okunamadı: ${error.message}`);
  return (data ?? []).map((s) => ({ id: s.id, rev: s.rev, kim: s.kim, at: s.created_at }));
}

export async function surum(id: number) {
  const { data, error } = await db().from("post_editoru_surumler").select("id, rev, kim, created_at, data").eq("id", id).maybeSingle();
  if (error) throw new Error(`Sürüm okunamadı: ${error.message}`);
  if (!data) throw new TasarimHata("Sürüm bulunamadı.", 404);
  return { id: data.id, rev: data.rev, kim: data.kim, at: data.created_at, data: durumOf(data.data) };
}
