import { apply, durumOf, type Durum, type Op } from "./ops";
import { db, type EditorKullanicisi } from "./erisim";
import { disariAl } from "./yukle";

/**
 * Ortak post listesi. Eskiden yerel sunucu listeyi bellekte tutup herkese
 * WebSocket ile yayıyordu; Vercel'de kalıcı bağlantı olmadığı için liste
 * veritabanında, değişiklikler işlem günlüğünde duruyor ve editörler yokluyor
 * (bkz. public/post-editoru/ortak-istemci.js).
 */

/** Bu kadar süredir yoklamayan kişi editörden ayrılmış sayılır. */
const KISI_OMRU_MS = 8_000;
/** İşlem günlüğü bu kadar geriye tutulur; daha eski bir yerden yoklayan tam listeyi alır. */
const GUNLUK_OMRU_MS = 15 * 60_000;
const MAX_OPS = 2000;

export class OrtakHata extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

const FORMATLAR = ["feed", "story", "kare", "yatay"] as const;
type Konum = { post: string; fmt: (typeof FORMATLAR)[number]; x: number | null; y: number | null; sel: string | null };
type Kisi = { cid: string; name: string; color: string; at: Konum | null };

const okCid = (cid: unknown): cid is string => typeof cid === "string" && /^[a-f0-9]{8,32}$/.test(cid);

function konumOf(raw: string | null): Konum | null {
  if (!raw) return null;
  try {
    const m = JSON.parse(raw);
    return {
      post: String(m.post || "").slice(0, 40),
      fmt: FORMATLAR.includes(m.fmt) ? m.fmt : "feed",
      x: Number.isFinite(m.x) ? m.x : null,
      y: Number.isFinite(m.y) ? m.y : null,
      sel: m.sel ? String(m.sel).slice(0, 40) : null,
    };
  } catch {
    return null;
  }
}

async function durumOku(): Promise<{ rev: number; data: Durum | null }> {
  // Supabase'e ilk bağlantı ara sıra mesajsız bir ağ hatasıyla düşüyor; bir kez daha dene
  for (let deneme = 0; ; deneme++) {
    const { data, error } = await db().from("post_editoru_durum").select("rev, data").eq("id", 1).single();
    if (!error) return { rev: Number(data.rev), data: durumOf(data.data) };
    console.error("[post-editoru] liste okunamadı", deneme, error);
    if (deneme >= 1) throw new Error(`Post listesi okunamadı: ${error.message || error.code || "bağlantı hatası"}`);
    await new Promise((r) => setTimeout(r, 400));
  }
}

async function kisiler(me: EditorKullanicisi, cid: string, konum: Konum | null): Promise<Kisi[]> {
  const now = Date.now();
  const { error } = await db()
    .from("post_editoru_kisiler")
    .upsert({ cid, kullanici: me.id, ad: me.name, renk: me.color, konum, goruldu: new Date(now).toISOString() });
  if (error) throw new Error(`Bağlantı kaydedilemedi: ${error.message}`);

  // eski bağlantıları ve günlüğü ara sıra temizle
  if (Math.random() < 0.03) {
    await Promise.all([
      db().from("post_editoru_kisiler").delete().lt("goruldu", new Date(now - 3600_000).toISOString()),
      db().from("post_editoru_islemler").delete().lt("created_at", new Date(now - GUNLUK_OMRU_MS).toISOString()),
    ]);
  }

  const { data } = await db()
    .from("post_editoru_kisiler")
    .select("cid, ad, renk, konum")
    .gt("goruldu", new Date(now - KISI_OMRU_MS).toISOString());
  return (data ?? []).map((k) => ({ cid: k.cid, name: k.ad, color: k.renk, at: k.konum as Konum | null }));
}

/**
 * Yoklama. `since` yoksa tam liste; varsa o revden sonraki işlemler. Günlükte
 * boşluk varsa (budanmış ya da çok geride kalınmış) yine tam liste döner.
 */
export async function yokla(
  me: EditorKullanicisi,
  q: { cid: string | null; since: string | null; konum: string | null }
) {
  if (!okCid(q.cid)) throw new OrtakHata("Geçersiz bağlantı.");
  const since = q.since == null ? null : Number(q.since);
  const [people, durum] = await Promise.all([kisiler(me, q.cid, konumOf(q.konum)), durumOku()]);
  const tam = { me, rev: durum.rev, data: durum.data, people };

  if (since == null || !Number.isFinite(since)) return tam;
  if (since >= durum.rev) return { rev: durum.rev, log: [], people };

  const { data: log, error } = await db()
    .from("post_editoru_islemler")
    .select("rev, cid, seq, kim, ops")
    .gt("rev", since)
    .order("rev")
    .limit(500);
  if (error) throw new Error(`Değişiklikler okunamadı: ${error.message}`);

  const rows = (log ?? []).map((r) => ({ rev: Number(r.rev), cid: r.cid, seq: r.seq, by: r.kim, ops: r.ops as Op[] }));
  const kesintisiz =
    rows.length > 0 &&
    rows.every((r, i) => r.rev === since + 1 + i) &&
    rows[rows.length - 1].rev >= durum.rev;
  if (!kesintisiz) return tam;

  return { rev: rows[rows.length - 1].rev, log: rows, people };
}

/** Sürüm geçmişi: kayıt sırasında en fazla bu sıklıkta anlık görüntü alınır. */
const SURUM_ARALIGI_MS = 10 * 60_000;
let sonSurum = 0;

async function surumAl(rev: number, data: Durum, kim: string) {
  // aynı sunucu örneği yakın zamanda aldıysa veritabanına hiç sorma
  if (Date.now() - sonSurum < SURUM_ARALIGI_MS) return;
  const { data: son } = await db()
    .from("post_editoru_surumler")
    .select("created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const t = son ? new Date(son.created_at).getTime() : 0;
  if (Date.now() - t < SURUM_ARALIGI_MS) {
    sonSurum = t;
    return;
  }
  sonSurum = Date.now();
  await db().from("post_editoru_surumler").insert({ rev, data, kim });
}

/**
 * İşlemleri listeye uygular. Başkası aynı anda yazdıysa güncel listeyi okuyup
 * yeniden dener: işlemler sırayla uygulandığı için herkes aynı sonuca varır.
 */
export async function kaydet(me: EditorKullanicisi, body: { cid?: unknown; seq?: unknown; ops?: unknown }) {
  if (!okCid(body.cid)) throw new OrtakHata("Geçersiz bağlantı.");
  if (!Array.isArray(body.ops) || body.ops.length > MAX_OPS) throw new OrtakHata("Geçersiz değişiklik.");
  const ops = body.ops as Op[];
  const seq = Number.isInteger(body.seq) ? (body.seq as number) : null;

  for (let deneme = 0; deneme < 8; deneme++) {
    const { rev, data } = await durumOku();
    if (!data) throw new OrtakHata("Post listesi henüz hazır değil. Sayfayı yenile.", 409);

    const applied = ops.filter((op) => apply(data, op));
    if (!applied.length) return { rev, ops: [] };
    if (applied.some((op) => op.k === "add" || op.k === "del" || op.k === "order")) {
      applied.push({ k: "order", ids: data.posts.map((p) => p.id) });
    }

    const { data: yeni, error } = await db().rpc("post_editoru_kaydet", {
      p_rev: rev,
      p_data: data,
      p_ops: applied,
      p_cid: body.cid,
      p_seq: seq,
      p_kim: me.name,
    });
    if (error) throw new Error(`Değişiklik kaydedilemedi: ${error.message}`);
    if (yeni != null) {
      await surumAl(Number(yeni), data, me.name);
      return { rev: Number(yeni), ops: applied };
    }
  }
  throw new OrtakHata("Aynı anda çok fazla değişiklik var; birazdan tekrar dene.", 503);
}

/** Liste boşken ilk açan kendi tarayıcısındaki postları (ya da varsayılanları) yükler. */
export async function tohumla(me: EditorKullanicisi, body: { posts?: unknown; uploads?: unknown }) {
  const mevcut = await durumOku();
  if (mevcut.data) return { rev: mevcut.rev, data: mevcut.data };

  const data = durumOf({ posts: body.posts, uploads: body.uploads });
  if (!data?.posts.length) throw new OrtakHata("Yüklenecek post yok.");
  const temiz = await disariAl(data);

  const { data: yeni, error } = await db().rpc("post_editoru_kaydet", {
    p_rev: mevcut.rev,
    p_data: temiz,
    p_ops: [],
    p_cid: "tohum",
    p_seq: null,
    p_kim: me.name,
  });
  if (error) throw new Error(`Post listesi kaydedilemedi: ${error.message}`);
  // aynı anda başkası tohumladıysa onunki geçerli
  if (yeni == null) {
    const simdi = await durumOku();
    return { rev: simdi.rev, data: simdi.data };
  }
  return { rev: Number(yeni), data: temiz };
}
