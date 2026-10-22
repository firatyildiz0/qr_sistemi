import { createHash } from "crypto";
import { db } from "./erisim";

const BUCKET = "post-editoru";
const MAX_BYTES = 8e6;

/**
 * Editöre yüklenen fotoğrafı kovaya yazar ve herkese açık adresini döner.
 * Ad içeriğin özeti: aynı fotoğrafı ikinci kez yüklemek yeni dosya açmıyor.
 */
export async function fotografKaydet(dataUrl: unknown): Promise<string> {
  const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(typeof dataUrl === "string" ? dataUrl : "");
  if (!m) throw new Error("Görsel JPG, PNG ya da WEBP olmalı.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_BYTES) throw new Error("Görsel çok büyük (en fazla 8 MB).");

  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const path = `yuklenen/${createHash("sha1").update(buf).digest("hex").slice(0, 16)}.${ext}`;
  const storage = db().storage.from(BUCKET);
  const { error } = await storage.upload(path, buf, { contentType: `image/${m[1]}`, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Fotoğraf yüklenemedi: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

/** Sunucuda üretilen görseli (Gemini) kovaya yazar. */
export async function bufferKaydet(buf: Buffer, mime: string, klasor: "ai" | "stok" | "yuklenen" = "ai"): Promise<string> {
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const path = `${klasor}/${createHash("sha1").update(buf).digest("hex").slice(0, 16)}.${ext}`;
  const storage = db().storage.from(BUCKET);
  const { error } = await storage.upload(path, buf, { contentType: mime, upsert: true, cacheControl: "31536000" });
  if (error) throw new Error(`Görsel kaydedilemedi: ${error.message}`);
  return storage.getPublicUrl(path).data.publicUrl;
}

/**
 * Editördeki bir görseli okur (AI ile düzenleme, arka plan kaldırma).
 * Yalnızca kendi kütüphanemiz (/post-editoru/img/…) ve kendi kovamız: istemciden
 * gelen adresle başka bir sunucuya istek atılmasın.
 */
export async function kaynakOku(src: unknown, origin: string): Promise<{ data: string; mime: string }> {
  if (typeof src !== "string" || !src) throw new Error("Görsel seçilmedi.");
  const kova = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`;
  let url: URL;
  if (src.startsWith(kova)) url = new URL(src);
  else if (/^img\/[\w./-]+\.(jpe?g|png|webp)$/i.test(src) && !src.includes("..")) url = new URL(`/post-editoru/${src}`, origin);
  else throw new Error("Bu görsel düzenlenemiyor.");

  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Görsel okunamadı.");
  const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
  if (!/^image\/(jpeg|png|webp)$/.test(mime)) throw new Error("Görsel JPG, PNG ya da WEBP olmalı.");
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error("Görsel çok büyük.");
  return { data: buf.toString("base64"), mime };
}

/**
 * Reels videosu Vercel'in istek sınırını (4,5 MB) aştığı için tarayıcıdan
 * doğrudan kovaya yükleniyor; sunucu yalnızca tek kullanımlık imzalı adres veriyor.
 */
export async function videoYuklemeAdresi(): Promise<{ signedUrl: string; publicUrl: string }> {
  const path = `video/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.mp4`;
  const storage = db().storage.from(BUCKET);
  const { data, error } = await storage.createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Yükleme adresi alınamadı: ${error?.message}`);
  return { signedUrl: data.signedUrl, publicUrl: storage.getPublicUrl(path).data.publicUrl };
}

/** Eski tarayıcı kayıtlarındaki gömülü (data:) görselleri dosyaya çevirir. */
export async function disariAl<T>(o: T): Promise<T> {
  if (typeof o === "string") {
    if (!o.startsWith("data:image/")) return o;
    try {
      return (await fotografKaydet(o)) as T;
    } catch {
      return o;
    }
  }
  if (Array.isArray(o)) return (await Promise.all(o.map(disariAl))) as T;
  if (o && typeof o === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o)) out[k] = await disariAl(v);
    return out as T;
  }
  return o;
}
