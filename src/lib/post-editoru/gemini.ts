/**
 * Görsel üretimi ve düzenleme: Google Gemini görsel modeli ("Nano Banana").
 * Claude görsel üretmiyor; metni Claude, görseli Gemini yapıyor.
 *
 * Fiyat (2026-10-22, ai.google.dev/gemini-api/docs/pricing): gemini-nano-banana-2.1
 * 1K görsel $0.0336, 2K $0.0504. Ücretsiz katman görsel modellerinde yok.
 * Bütün üretilen görsellerde Google'ın görünmez SynthID filigranı var.
 *
 * Uç nokta Interactions API. Yanıttaki görselin yeri belgelerde örnekle
 * gösterilmediği (SDK'lar `output_image` / `outputs[]` / `steps[]` üzerinden
 * okuyor) için yanıt, base64 görsel taşıyan ilk düğüm aranarak okunuyor.
 */

const MODEL = "gemini-nano-banana-2.1";
const API = "https://generativelanguage.googleapis.com/v1beta/interactions";

export const geminiYapilandirildi = () => Boolean(process.env.GEMINI_API_KEY);

export type Oran = "1:1" | "3:4" | "4:5" | "9:16" | "16:9" | "4:3";
export type Girdi = { data: string; mime: string };

type Bulunan = { data: string; mime: string };

// base64 görsel taşıyan ilk düğümü bulur: { type: "image", data } / { data, mime_type } / { inlineData: { data, mimeType } }
function gorselBul(node: unknown, derinlik = 0): Bulunan | null {
  if (!node || typeof node !== "object" || derinlik > 12) return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const b = gorselBul(x, derinlik + 1);
      if (b) return b;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const inline = (o.inlineData ?? o.inline_data) as Record<string, unknown> | undefined;
  if (inline && typeof inline.data === "string") {
    return { data: inline.data, mime: String(inline.mimeType ?? inline.mime_type ?? "image/png") };
  }
  const mime = String(o.mime_type ?? o.mimeType ?? "");
  if (typeof o.data === "string" && o.data.length > 1000 && (o.type === "image" || mime.startsWith("image/"))) {
    return { data: o.data, mime: mime || "image/png" };
  }
  // önce kısayol alanları, sonra geri kalanı
  for (const k of ["output_image", "outputImage", "outputs", "steps", "content", "candidates", "parts"]) {
    if (k in o) {
      const b = gorselBul(o[k], derinlik + 1);
      if (b) return b;
    }
  }
  for (const [k, v] of Object.entries(o)) {
    if (["output_image", "outputImage", "outputs", "steps", "content", "candidates", "parts"].includes(k)) continue;
    const b = gorselBul(v, derinlik + 1);
    if (b) return b;
  }
  return null;
}

function metinBul(node: unknown, derinlik = 0): string {
  if (!node || typeof node !== "object" || derinlik > 12) return "";
  if (Array.isArray(node)) return node.map((x) => metinBul(x, derinlik + 1)).filter(Boolean).join(" ");
  const o = node as Record<string, unknown>;
  if (o.type === "text" && typeof o.text === "string") return o.text;
  return Object.values(o).map((v) => metinBul(v, derinlik + 1)).filter(Boolean).join(" ");
}

/**
 * Metinden (ve isteğe bağlı referans görsellerden) tek görsel üretir.
 * Referans görsel verilirse istem onu düzenleme talimatı olarak kullanır.
 */
export async function gorselUret(
  istem: string,
  secenek: { oran?: Oran; boyut?: "1K" | "2K"; girdiler?: Girdi[] } = {}
): Promise<{ buf: Buffer; mime: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Görsel üretimi için GEMINI_API_KEY tanımlı değil.");

  const input: unknown[] = [{ type: "text", text: istem }];
  for (const g of secenek.girdiler ?? []) input.push({ type: "image", mime_type: g.mime, data: g.data });

  let r: Response;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        input,
        response_format: {
          type: "image",
          mime_type: "image/jpeg",
          ...(secenek.oran ? { aspect_ratio: secenek.oran } : {}),
          image_size: secenek.boyut ?? "2K",
        },
      }),
      signal: AbortSignal.timeout(150_000),
    });
  } catch {
    throw new Error("Gemini'ye ulaşılamadı. Biraz sonra tekrar dene.");
  }

  const j = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = (j as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${r.status}`;
    console.error("[post-editoru] gemini hatası", r.status, msg);
    if (r.status === 400 && /api key/i.test(msg)) throw new Error("Gemini API anahtarı geçersiz.");
    if (r.status === 403) throw new Error("Gemini anahtarının bu modele izni yok ya da faturalandırma kapalı.");
    // ücretsiz katmanda görsel modellerinin kotası sıfır: bekleyerek düzelmez
    if (r.status === 429 && /free tier|limit: 0/i.test(msg))
      throw new Error("Gemini anahtarı ücretsiz katmanda; görsel üretimi için Google AI Studio'da faturalandırmayı aç (aistudio.google.com → Billing).");
    if (r.status === 429) throw new Error("Gemini kotası doldu ya da çok yoğun. Biraz sonra tekrar dene.");
    throw new Error(`Gemini görseli üretemedi: ${msg}`.slice(0, 300));
  }

  const g = gorselBul(j);
  if (!g) {
    const neden = metinBul(j).slice(0, 200);
    throw new Error(neden ? `Gemini görsel döndürmedi: ${neden}` : "Gemini görsel döndürmedi. İstemi değiştirip tekrar dene.");
  }
  return { buf: Buffer.from(g.data, "base64"), mime: g.mime };
}
