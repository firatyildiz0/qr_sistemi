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
