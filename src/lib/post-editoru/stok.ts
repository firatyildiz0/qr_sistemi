import { bufferKaydet } from "./yukle";

/**
 * Stok fotoğraf: Pexels API (ücretsiz; saatte 200, ayda 20.000 istek).
 * Pexels'in kuralı: arama ekranında Pexels'e görünür bağlantı ve mümkünse
 * fotoğrafçıya atıf. İkisi de editördeki arama panelinde.
 *
 * Seçilen fotoğraf kendi kovamıza kopyalanıyor: PNG/Instagram çizimi başka bir
 * sitenin CORS ayarına bağlı kalmasın.
 */

const API = "https://api.pexels.com/v1";

export const stokYapilandirildi = () => Boolean(process.env.PEXELS_API_KEY);

type PexelsFoto = {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  alt: string;
  src: Record<string, string>;
};

async function pexels(path: string) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) throw new Error("Stok fotoğraf için PEXELS_API_KEY tanımlı değil.");
  const r = await fetch(API + path, { headers: { Authorization: key }, cache: "no-store" });
  if (r.status === 429) throw new Error("Pexels saatlik arama sınırı doldu. Biraz sonra tekrar dene.");
  if (!r.ok) throw new Error(`Pexels yanıt vermedi (${r.status}).`);
  return r.json();
}

export async function stokAra(q: string, sayfa: number, yon: string | null) {
  const query = q.trim().slice(0, 100);
  if (!query) return { photos: [], next: false };
  const params = new URLSearchParams({ query, per_page: "30", page: String(Math.max(1, Math.min(50, sayfa || 1))), locale: "tr-TR" });
  if (yon === "portrait" || yon === "landscape" || yon === "square") params.set("orientation", yon);
  const j = await pexels(`/search?${params}`);
  return {
    photos: (j.photos as PexelsFoto[]).map((p) => ({
      id: p.id,
      w: p.width,
      h: p.height,
      thumb: p.src.medium,
      alt: p.alt || "",
      by: p.photographer,
      byUrl: p.photographer_url,
      url: p.url,
    })),
    next: Boolean(j.next_page),
  };
}

/** Fotoğrafı kimliğinden bulup (istemcinin verdiği adrese gidilmiyor) kovaya kopyalar. */
export async function stokAl(id: unknown) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Geçersiz fotoğraf.");
  const p = (await pexels(`/photos/${n}`)) as PexelsFoto;
  const src = p.src.large2x || p.src.large || p.src.original;
  const u = new URL(src);
  if (u.protocol !== "https:" || !u.hostname.endsWith("pexels.com")) throw new Error("Fotoğraf beklenmeyen bir adresten geldi.");
  const r = await fetch(u, { cache: "no-store" });
  if (!r.ok) throw new Error("Fotoğraf indirilemedi.");
  const mime = (r.headers.get("content-type") || "image/jpeg").split(";")[0];
  const kayit = await bufferKaydet(Buffer.from(await r.arrayBuffer()), mime, "stok");
  return { src: kayit, name: `${p.alt || "Pexels fotoğrafı"}`.slice(0, 60), by: p.photographer, w: p.width, h: p.height };
}
