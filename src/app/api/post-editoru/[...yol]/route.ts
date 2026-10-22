import { NextResponse, type NextRequest } from "next/server";
import { editorKullanicisi, type EditorKullanicisi } from "@/lib/post-editoru/erisim";
import { OrtakHata, kaydet, tohumla, yokla } from "@/lib/post-editoru/ortak";
import { aiYapilandirildi, isDurumu, isIptal, postUret, yenidenUret } from "@/lib/post-editoru/ai";
import * as Tarz from "@/lib/post-editoru/tarz";
import * as Ig from "@/lib/post-editoru/instagram";
import { fotografKaydet } from "@/lib/post-editoru/yukle";

/**
 * Post editörünün (/yonetim/post-editoru) bütün uçları. Yerel editörün
 * sunucusundaki (sunucu.js) yolların aynısı, başlarında /api/post-editoru:
 * editörün tarayıcı kodu böylece neredeyse hiç değişmedi.
 *
 * Kapı tek: onaylı superuser. Yönetim panelinin geri kalanı gibi.
 */

// AI üretimi yanıt gittikten sonra sürüyor (`after`); Instagram paylaşımı
// görselin işlenmesini bekliyor. İkisi de uzun.
export const maxDuration = 300;

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const hata = (e: unknown, status = 400) => json({ error: (e as Error)?.message || "İstek başarısız oldu." }, status);

async function govde(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? b : {};
  } catch {
    return {};
  }
}

type Ctx = { params: Promise<{ yol: string[] }> };

// Başka bir site tarayıcı üzerinden istek atamasın: Origin varsa bu sitenin olmalı.
const ayniKoken = (req: NextRequest) => {
  const o = req.headers.get("origin");
  if (!o) return true;
  try {
    return new URL(o).host === req.headers.get("host");
  } catch {
    return false;
  }
};

async function giris(req: NextRequest, ctx: Ctx): Promise<{ me: EditorKullanicisi; yol: string } | Response> {
  if (req.method !== "GET" && !ayniKoken(req)) return json({ error: "İzin yok" }, 403);
  const me = await editorKullanicisi();
  if (!me) return json({ error: "Oturumun kapanmış. Sayfayı yenileyip yeniden giriş yap." }, 401);
  return { me, yol: (await ctx.params).yol.join("/") };
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const g = await giris(req, ctx);
  if (g instanceof Response) return g;
  const { me, yol } = g;
  const q = req.nextUrl.searchParams;

  try {
    if (yol === "ben") return json({ me, local: false, canli: null });
    if (yol === "ortak") return json(await yokla(me, { cid: q.get("cid"), since: q.get("since"), konum: q.get("konum") }));
    if (yol === "ai/prefs") return json(await Tarz.profile());
    if (yol.startsWith("ai/jobs/")) {
      const s = await isDurumu(yol.slice("ai/jobs/".length));
      return s ? json(s) : json({ error: "Bulunamadı" }, 404);
    }
    if (yol === "ig/status") return json(await Ig.status());
  } catch (e) {
    return hata(e, e instanceof OrtakHata ? e.status : 500);
  }
  return json({ error: "Bulunamadı" }, 404);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const g = await giris(req, ctx);
  if (g instanceof Response) return g;
  const { me, yol } = g;

  if (yol === "ortak") {
    const b = await govde(req);
    try {
      return json(b.t === "tohum" ? await tohumla(me, b) : await kaydet(me, b));
    } catch (e) {
      return hata(e, e instanceof OrtakHata ? e.status : 500);
    }
  }

  if (yol === "yukle") {
    try {
      return json({ src: await fotografKaydet((await govde(req)).image) });
    } catch (e) {
      return hata(e);
    }
  }

  if (yol === "ai/jobs" || yol === "ai/regen") {
    if (!aiYapilandirildi()) return json({ error: "AI üretimi için ANTHROPIC_API_KEY tanımlı değil." }, 503);
    try {
      const b = await govde(req);
      return json({ id: yol === "ai/jobs" ? await postUret(me, b) : await yenidenUret(me, b) }, 202);
    } catch (e) {
      return hata(e);
    }
  }

  if (yol === "ai/prefs") {
    try {
      return json(await Tarz.record(await govde(req)));
    } catch (e) {
      return hata(e);
    }
  }

  if (yol === "ig/sync") {
    try {
      return json({ records: await Ig.sync(true) });
    } catch (e) {
      return hata(e, 502);
    }
  }

  if (yol === "ig/publish") {
    try {
      const record = await Ig.publish(await govde(req));
      return json({ record, records: await Ig.kayitlar() });
    } catch (e) {
      const err = e as Ig.IgError;
      const status = err.status && err.status < 500 && err.status !== 404 ? err.status : 502;
      return json({ error: err.message, record: err.record, records: await Ig.kayitlar().catch(() => ({})) }, status);
    }
  }

  return json({ error: "Bulunamadı" }, 404);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const g = await giris(req, ctx);
  if (g instanceof Response) return g;
  const { yol } = g;

  try {
    if (yol === "ai/prefs") return json(await Tarz.reset());
    if (yol.startsWith("ai/jobs/")) {
      return (await isIptal(yol.slice("ai/jobs/".length))) ? json({ ok: true }) : json({ error: "Bulunamadı" }, 404);
    }
  } catch (e) {
    return hata(e, 500);
  }
  return json({ error: "Bulunamadı" }, 404);
}
