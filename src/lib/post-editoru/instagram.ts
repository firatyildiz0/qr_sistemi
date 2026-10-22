import { createHash } from "crypto";
import { after } from "next/server";
import { ayarOku, ayarYaz } from "./erisim";

/**
 * Postu RentQR'ın kendi Instagram hesabında paylaşır. Editörün çizdiği JPEG
 * önce Cloudinary'ye yüklenir (Instagram görseli herkese açık bir adresten
 * kendisi indiriyor), sonra Instagram API ile konteyner açılıp yayınlanır.
 *
 * Bu, satıcıların DM asistanı için bağladığı hesaplardan (src/lib/instagram)
 * ayrı: tek bir hesap, token ortam değişkeninde. Uzun ömürlü token 60 gün
 * geçerli ve haftada bir yenileniyor; yenisi ayarlar tablosunda tutuluyor ve
 * ortamdakinden önce geliyor.
 *
 * Paylaşılan post ikinci kez paylaşılamaz. Instagram'dan silinirse `sync`
 * bunu fark edip kaydı düşürür ve post yeniden paylaşılabilir hâle gelir.
 */

const API = "https://graph.instagram.com/v23.0";
/** Silinme denetimini en fazla bu sıklıkta yap. */
const CHECK_TTL = 30_000;
const REFRESH_AFTER = 7 * 864e5;

type Hesap = { accessToken?: string; tokenAt?: number; userId?: string; username?: string };
export type Kayit = { mediaId: string; permalink: string; at: string; username: string };
type Kayitlar = Record<string, Kayit>;

export class IgError extends Error {
  code?: number;
  status?: number;
  record?: Kayit;
  constructor(msg: string, extra: { code?: number; status?: number; record?: Kayit } = {}) {
    super(msg);
    Object.assign(this, extra);
  }
}

const cloudinaryConfig = () => ({
  cloudName: process.env.POST_EDITORU_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.POST_EDITORU_CLOUDINARY_API_KEY,
  apiSecret: process.env.POST_EDITORU_CLOUDINARY_API_SECRET,
});

async function hesap(): Promise<Hesap> {
  const kayitli = await ayarOku<Hesap>("instagram", {});
  return { ...kayitli, accessToken: kayitli.accessToken || process.env.POST_EDITORU_IG_ACCESS_TOKEN };
}

export const kayitlar = () => ayarOku<Kayitlar>("ig_paylasimlar", {});
const kayitlariYaz = (r: Kayitlar) => ayarYaz("ig_paylasimlar", r);

export function missing(h: Hesap): string[] {
  const m: string[] = [];
  const c = cloudinaryConfig();
  if (!h.accessToken) m.push("Instagram erişim anahtarı (POST_EDITORU_IG_ACCESS_TOKEN)");
  if (!c.cloudName || !c.apiKey || !c.apiSecret) m.push("Cloudinary anahtarları (POST_EDITORU_CLOUDINARY_*)");
  return m;
}

// Graph API çağrısı; hata gövdesini (code, subcode) koruyarak fırlatır
async function graph(token: string, method: "GET" | "POST", p: string, params: Record<string, string> = {}) {
  const u = new URL(API + p);
  const body = new URLSearchParams({ ...params, access_token: token });
  let r: Response;
  try {
    r = method === "GET" ? await fetch(`${u}?${body}`, { cache: "no-store" }) : await fetch(u, { method, body });
  } catch {
    throw new IgError("Instagram'a ulaşılamadı. Biraz sonra tekrar dene.");
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    const e = j.error || {};
    const msg =
      e.code === 190
        ? "Instagram oturumunun süresi dolmuş ya da geçersiz. POST_EDITORU_IG_ACCESS_TOKEN'ı yenile."
        : e.code === 9 || e.code === 4 || e.code === 17
          ? "Instagram paylaşım sınırına ulaşıldı (24 saatte en fazla 100 post). Daha sonra tekrar dene."
          : `Instagram hatası: ${e.error_user_msg || e.message || r.status}`;
    throw new IgError(msg, { code: e.code, status: r.status });
  }
  return j;
}

// Haftada bir yenile; hata olursa eski token kalır.
async function maybeRefresh(h: Hesap): Promise<Hesap> {
  if (!h.accessToken || Date.now() - (h.tokenAt || 0) < REFRESH_AFTER) return h;
  try {
    const r = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(h.accessToken)}`,
      { cache: "no-store" }
    );
    const j = await r.json();
    if (j.access_token) {
      const yeni = { ...h, accessToken: j.access_token, tokenAt: Date.now() };
      await ayarYaz("instagram", yeni);
      return yeni;
    }
  } catch {}
  return h;
}

async function account(h: Hesap) {
  if (h.userId && h.username) return { id: h.userId, username: h.username };
  const me = await graph(h.accessToken!, "GET", "/me", { fields: "user_id,username" });
  const yeni = { ...h, userId: String(me.user_id || me.id), username: me.username };
  // token ortamdan geliyorsa tokenAt boş kalır: ilk açılışta bir kez yenilenir
  await ayarYaz("instagram", yeni);
  return { id: yeni.userId, username: yeni.username };
}

/* ---------- Cloudinary: imzalı yükleme ve silme ---------- */
const sign = (params: Record<string, string | number>, secret: string) =>
  createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join("&") + secret
    )
    .digest("hex");

async function cloudinary(action: "upload" | "destroy", params: { file?: string } & Record<string, string>) {
  const { cloudName, apiKey, apiSecret } = cloudinaryConfig();
  const { file, ...rest } = params;
  const p: Record<string, string> = { ...rest, timestamp: String(Math.floor(Date.now() / 1000)) };
  const fd = new FormData();
  // Cloudinary imzaya dosyayı katmaz
  Object.entries({ ...p, ...(file ? { file } : {}), api_key: apiKey!, signature: sign(p, apiSecret!) }).forEach(([k, v]) =>
    fd.append(k, v)
  );
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/${action}`, { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new IgError(`Görsel Cloudinary'ye yüklenemedi: ${j.error?.message || r.status}`);
  return j;
}

/* ---------- paylaşım ve silinme denetimi ---------- */
// true: Instagram'da duruyor, false: silinmiş, null: şu an anlaşılamadı (ağ/token sorunu; kayıt korunur)
async function alive(token: string, mediaId: string): Promise<boolean | null> {
  try {
    await graph(token, "GET", "/" + mediaId, { fields: "id" });
    return true;
  } catch (e) {
    const err = e as IgError;
    return err.code === 100 || err.status === 404 ? false : null;
  }
}

let lastCheck = 0;
export async function sync(force: boolean): Promise<Kayitlar> {
  const r = await kayitlar();
  const h = await hesap();
  if (missing(h).length || (!force && Date.now() - lastCheck < CHECK_TTL)) return r;
  lastCheck = Date.now();
  let changed = false;
  for (const [postId, rec] of Object.entries(r)) {
    if ((await alive(h.accessToken!, rec.mediaId)) === false) {
      delete r[postId];
      changed = true;
    }
  }
  if (changed) await kayitlariYaz(r);
  return r;
}

export async function status() {
  let h = await hesap();
  const need = missing(h);
  if (need.length) return { ready: false, missing: need, records: await kayitlar() };
  h = await maybeRefresh(h);
  try {
    const { username } = await account(h);
    return { ready: true, username, records: await sync(false) };
  } catch (e) {
    return { ready: false, error: (e as Error).message, records: await kayitlar() };
  }
}

// aynı sunucu örneğinde aynı post iki kez gönderilmesin (çift tıklama)
const busy = new Set<string>();

export async function publish(body: { postId?: unknown; image?: unknown; caption?: unknown }): Promise<Kayit> {
  const postId = typeof body.postId === "string" ? body.postId : "";
  if (!/^[a-z0-9]+$/i.test(postId)) throw new IgError("Geçersiz post.", { status: 400 });
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(typeof body.image === "string" ? body.image : "");
  if (!m) throw new IgError("Görsel JPEG olmalı.", { status: 400 });
  const h = await hesap();
  const need = missing(h);
  if (need.length) throw new IgError(`Instagram bağlantısı kurulmamış: ${need.join(", ")} eksik.`, { status: 503 });
  if (busy.has(postId)) throw new IgError("Bu post şu anda paylaşılıyor.", { status: 409 });
  busy.add(postId);

  const token = h.accessToken!;
  let upload: { public_id?: string; secure_url?: string } | undefined;
  try {
    // aynı post ikinci kez paylaşılamaz; Instagram'dan silindiyse kayıt düşer ve paylaşım serbest kalır
    const existing = (await kayitlar())[postId];
    if (existing) {
      const a = await alive(token, existing.mediaId);
      if (a !== false)
        throw new IgError(
          a
            ? "Bu post zaten Instagram'da paylaşıldı. Yeniden paylaşmak için önce Instagram'dan sil."
            : "Postun Instagram'daki durumu denetlenemedi; yinelenmesin diye paylaşım durduruldu. Biraz sonra tekrar dene.",
          { status: 409, record: existing }
        );
      const r = await kayitlar();
      delete r[postId];
      await kayitlariYaz(r);
    }
    const acc = await account(h);
    upload = await cloudinary("upload", {
      file: `data:image/jpeg;base64,${m[1]}`,
      folder: "rentqr-instagram",
      public_id: `${postId}-${Date.now()}`,
    });
    const box = await graph(token, "POST", `/${acc.id}/media`, {
      image_url: upload!.secure_url!,
      caption: String(body.caption || "").slice(0, 2200),
    });
    // görsel konteyneri genelde hemen hazır olur; değilse kısa süre bekle
    for (let i = 0; i < 15; i++) {
      const s = await graph(token, "GET", "/" + box.id, { fields: "status_code" });
      if (s.status_code === "FINISHED") break;
      if (s.status_code === "ERROR" || s.status_code === "EXPIRED")
        throw new IgError("Instagram görseli işleyemedi. JPEG ve 4:5 oranında olduğundan emin ol.");
      await new Promise((r) => setTimeout(r, 2000));
    }
    const pub = await graph(token, "POST", `/${acc.id}/media_publish`, { creation_id: box.id });
    const info = await graph(token, "GET", "/" + pub.id, { fields: "permalink,timestamp" }).catch(() => ({}));
    const rec: Kayit = {
      mediaId: pub.id,
      permalink: info.permalink || "",
      at: info.timestamp || new Date().toISOString(),
      username: acc.username,
    };
    const r = await kayitlar();
    r[postId] = rec;
    await kayitlariYaz(r);
    return rec;
  } finally {
    busy.delete(postId);
    // Instagram görseli kendi sunucusuna aldı; geçici kopyayı sil
    const publicId = upload?.public_id;
    if (publicId) after(() => cloudinary("destroy", { public_id: publicId }).catch(() => {}));
  }
}
