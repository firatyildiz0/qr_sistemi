import { ayarOku, ayarYaz } from "./erisim";

/**
 * Tarz kataloğu ve deneme-yanılmayla öğrenilen tercih profili. "AI ile post
 * üret" her turda 3 farklı tarz sunar; hangi turda hangi tarzların
 * deneneceğine Claude değil bu dosya karar verir: 2 seçenek sevilenlere
 * yakın, 1 seçenek keşif. Renk teması ve düzenin çizimi tarayıcıda
 * (app.js THEMES/LAYOUTS) yapılıyor; kimlikler ikisinde aynı olmalı.
 */

const MAX_ROUNDS = 100;
const KEY = "tercihler";

type Deger = { name: string; desc?: string };
type Eksen = { label: string; values: Record<string, Deger> };

export const CATALOG = {
  voice: {
    label: "Metin yaklaşımı",
    values: {
      soru: { name: "Soru ile açılış", desc: "Başlık, işletme sahibine kendi derdini fark ettiren kısa bir soru." },
      rakam: {
        name: "Somut iş hesabı",
        desc: "Bir kiralamanın arkasındaki gerçek işi sayar: teslim, iade, temizlik, ütü, kargo günleri. Yalnızca bu sağduyu hesabı; süre/hız iddiası, yüzde ya da istatistik yok.",
      },
      an: {
        name: "Gerçek bir an",
        desc: 'Her kiralamacının yaşadığı sıradan bir an: "bu tarih boş mu" sorusu, teslim sabahı, geç gelen iade. Saat, kişi adı ya da kurgu ayrıntı yok.',
      },
      esprili: { name: "Esprili & hafif", desc: "Tebessüm ettiren, hafif ironik, kendinden emin; ama işletmeyi küçümsemeyen ve abartısız." },
      fayda: {
        name: "Doğrudan fayda",
        desc: "Soru yok; RentQR'ın tek bir somut işini düz bir cümleyle söyler (ör. çakışan rezervasyonu kaydederken durdurur). Slogan değil.",
      },
      oncesonra: {
        name: "Eski yol / yeni yol",
        desc: 'Defter ve WhatsApp ile çalışmayı RentQR ile çalışmaya doğal bir cümlede yan yana koyar; "Önce:/Sonra:" etiketi kullanmadan.',
      },
    },
  },
  palette: {
    label: "Renk teması",
    values: { bordo: { name: "Koyu bordo" }, krem: { name: "Açık krem" }, kirmizi: { name: "Kırmızı vurgu" }, gece: { name: "Gece siyahı" } },
  },
  layout: {
    label: "Düzen",
    values: { sol: { name: "Metin solda" }, alt: { name: "Metin altta" }, orta: { name: "Ortalanmış" } },
  },
  // Kütüphane fotoğrafları tek tarzda olduğu için görsel stili önizlemede
  // görünmüyor; görsel Gemini ile üretilirken uygulanıyor. Ağırlığı yarım.
  visual: {
    label: "Görsel stili",
    values: {
      showroom: {
        name: "Koyu showroom",
        desc: "Dark moody rental showroom with deep burgundy ambient light and near-black shadows. Soft warm key light from the side, subtle film grain.",
      },
      studio: {
        name: "Aydınlık stüdyo",
        desc: "Bright minimal studio on a seamless warm cream backdrop, soft diffused daylight, gentle shadows, airy and clean high-key commercial look.",
      },
      dogal: {
        name: "Doğal ortam",
        desc: "The product in its real-world setting that fits the sector (boutique, shop counter, wedding venue, city street or outdoor trail), natural window or golden-hour light, warm lifestyle feel.",
      },
      ustten: {
        name: "Üstten düzenleme",
        desc: "Top-down flat lay on a solid colored surface (deep red or warm cream), product and a few accessories neatly arranged, crisp even light, graphic composition.",
      },
      detay: {
        name: "Yakın detay",
        desc: "Macro close-up of the product material (fabric texture, lens glass, frame, stitching), very shallow depth of field, rich texture, cinematic side light.",
      },
    },
  },
} satisfies Record<string, Eksen>;

const PHOTO = `Editorial commercial photograph. A small white rectangular paper hang tag printed with a black QR code is attached to the product with a thin string.
Realistic materials, 50mm full-frame. No people's faces, no text, no logos, no watermark.`;
const COMPOSITION: Record<string, string> = {
  sol: "The left third of the frame is calm, empty negative space (text goes there); the product sits in the right two-thirds.",
  alt: "The lower 40% of the frame is calm, empty negative space (text goes there); the product sits in the upper part.",
  orta: "The product is centered and fairly small in the frame with generous calm space around it (text is overlaid in the center).",
};
/** Gemini görsel isteminin sonuna eklenen stil metni. */
export function imageStyle(visual: unknown, layout: unknown): string {
  const v = (CATALOG.visual.values as Record<string, Deger>)[String(visual)] ?? CATALOG.visual.values.showroom;
  return `${PHOTO}\n${v.desc}\n${COMPOSITION[String(layout)] ?? COMPOSITION.sol}`;
}

type Axis = keyof typeof CATALOG;
export type Style = Record<Axis, string>;
export type PlanItem = Style & { role: "profil" | "kesif" };
type Option = { style: Style; chosen: boolean; rating: number; note: string };
type Prefs = { rounds: { at: string; options: Option[] }[] };

export const AXES = Object.keys(CATALOG) as Axis[];
const HALF: Axis[] = ["visual"];
const ids = (ax: Axis) => Object.keys(CATALOG[ax].values);
const values = (ax: Axis) => CATALOG[ax].values as Record<string, Deger>;
export const nameOf = (ax: Axis, id: string) => values(ax)[id]?.name || id;
export const voiceOf = (id: unknown) => (typeof id === "string" ? (CATALOG.voice.values as Record<string, Deger>)[id] : undefined);

/** Geçerli bir tarz nesnesi döndürür; tanınmayan değer o eksenin ilk değerine düşer. */
export const cleanStyle = (s: unknown): Style =>
  Object.fromEntries(
    AXES.map((ax) => {
      const v = (s as Record<string, unknown> | null)?.[ax];
      return [ax, typeof v === "string" && values(ax)[v] ? v : ids(ax)[0]];
    })
  ) as Style;

async function read(): Promise<Prefs> {
  const p = await ayarOku<Prefs>(KEY, { rounds: [] });
  return Array.isArray(p?.rounds) ? p : { rounds: [] };
}

const shuffle = <T>(a: T[], rand: () => number) =>
  a.map((v) => [rand(), v] as const).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
// Seçilen +3, 👍 +1, 👎 −2, seçilmeyen ve oylanmayan −0,5 (başkası tercih edildi).
const weight = (o: Option) => (o.chosen ? 3 + (o.rating > 0 ? 1 : 0) : o.rating > 0 ? 1 : o.rating < 0 ? -2 : -0.5);

type Stats = Record<Axis, Record<string, { score: number; seen: number }>>;
function stats(p: Prefs): Stats {
  const s = Object.fromEntries(AXES.map((ax) => [ax, Object.fromEntries(ids(ax).map((id) => [id, { score: 0, seen: 0 }]))])) as Stats;
  for (const r of p.rounds)
    for (const o of r.options)
      for (const ax of AXES) {
        const v = s[ax][o.style[ax]];
        if (!v) continue;
        v.seen++;
        v.score += weight(o) * (HALF.includes(ax) ? 0.5 : 1);
      }
  return s;
}

/** Arayüzde gösterilen profil: eksen başına sevilen/sevilmeyen değerler ve son notlar. */
function profileOf(p: Prefs) {
  const s = stats(p);
  const axes = AXES.map((ax) => ({
    axis: ax,
    label: CATALOG[ax].label,
    values: ids(ax)
      .map((id) => ({ id, name: nameOf(ax, id), ...s[ax][id], score: Math.round(s[ax][id].score * 10) / 10 }))
      .sort((a, b) => b.score - a.score),
  }));
  const notes = p.rounds
    .flatMap((r) =>
      r.options
        .filter((o) => o.note)
        .map((o) => ({
          note: o.note,
          at: r.at,
          chosen: o.chosen,
          rating: o.rating,
          style: AXES.filter((ax) => !HALF.includes(ax)).map((ax) => nameOf(ax, o.style[ax])).join(" · "),
        }))
    )
    .reverse()
    .slice(0, 8);
  const pick = (f: (score: number) => boolean) =>
    axes.flatMap((a) => a.values.filter((v) => f(v.score)).map((v) => ({ axis: a.axis, label: a.label, name: v.name, score: v.score })));
  return { rounds: p.rounds.length, axes, liked: pick((x) => x >= 2), disliked: pick((x) => x <= -2), notes };
}

export const profile = async () => profileOf(await read());

/** Bir turun geri bildirimini kaydeder: her seçenek için tarz, seçildi mi, 👍/👎 ve not. */
export async function record(body: unknown) {
  const raw = (body as { options?: unknown })?.options;
  const opts = Array.isArray(raw) ? raw.slice(0, 3) : [];
  if (!opts.length) throw new Error("Geri bildirim boş");
  const options: Option[] = opts.map((o) => ({
    style: cleanStyle(o?.style),
    chosen: !!o?.chosen,
    rating: o?.rating === 1 || o?.rating === -1 ? o.rating : 0,
    note: typeof o?.note === "string" ? o.note.trim().slice(0, 200) : "",
  }));
  if (options.filter((o) => o.chosen).length > 1) throw new Error("Yalnızca bir seçenek seçilebilir");
  const p = await read();
  p.rounds.push({ at: new Date().toISOString(), options });
  p.rounds = p.rounds.slice(-MAX_ROUNDS);
  await ayarYaz(KEY, p);
  return profileOf(p);
}

export async function reset() {
  const p: Prefs = { rounds: [] };
  await ayarYaz(KEY, p);
  return profileOf(p);
}

/** Bu turun 3 tarzını seçer. İlk turda her eksende farklı değerler; sonra 2 profil + 1 keşif. */
export async function plan(rand = Math.random): Promise<PlanItem[]> {
  const p = await read();
  if (!p.rounds.length) {
    const cols = Object.fromEntries(AXES.map((ax) => [ax, shuffle(ids(ax), rand)])) as Record<Axis, string[]>;
    return [0, 1, 2].map((i) => ({
      ...(Object.fromEntries(AXES.map((ax) => [ax, cols[ax][i % cols[ax].length]])) as Style),
      role: "kesif" as const,
    }));
  }
  const s = stats(p);
  // puana göre sırala; eşitlikte rastgele (her tur aynı kombinasyon gelmesin)
  const ranked = Object.fromEntries(
    AXES.map((ax) => [ax, shuffle(ids(ax), rand).sort((a, b) => s[ax][b].score - s[ax][a].score)])
  ) as Record<Axis, string[]>;
  const A = Object.fromEntries(AXES.map((ax) => [ax, ranked[ax][0]])) as Style;
  const B = { ...A };
  for (const ax of shuffle(AXES, rand).slice(0, 2)) B[ax] = ranked[ax][1];
  // keşif: çok sevilmeyenleri (−3 altı) dışarıda bırakıp en az denenmiş, A ve B'den farklı değer
  const C = {} as Style;
  for (const ax of AXES) {
    const ok = ranked[ax].filter((v) => s[ax][v].score > -3);
    const pool = ok.length ? ok : ranked[ax];
    // önce ikisinden de farklı, olmazsa en azından A'dan farklı değer
    const fresh = [pool.filter((v) => v !== A[ax] && v !== B[ax]), pool.filter((v) => v !== A[ax]), pool].find((x) => x.length)!;
    C[ax] = [...fresh].sort((a, b) => s[ax][a].seen - s[ax][b].seen)[0];
  }
  return [
    { ...A, role: "profil" },
    { ...B, role: "profil" },
    { ...C, role: "kesif" },
  ];
}

/** Claude istemine eklenen tercih özeti (henüz tur yoksa boş). */
export async function promptNotes(): Promise<string> {
  const pr = await profile();
  if (!pr.rounds) return "";
  const list = (a: { label: string; name: string }[]) => a.map((v) => `${v.label}: ${v.name}`).join("; ") || "(henüz belirgin değil)";
  const notes = pr.notes
    .map(
      (n) =>
        `- "${n.note}" (${n.chosen ? "seçtiği" : n.rating > 0 ? "beğendiği" : n.rating < 0 ? "beğenmediği" : "seçmediği"} seçenek: ${n.style})`
    )
    .join("\n");
  return `KULLANICININ TARZ TERCİHLERİ (${pr.rounds} turdaki seçim ve oylardan öğrenildi)
- Sevdikleri: ${list(pr.liked)}
- Sevmedikleri: ${list(pr.disliked)}
${notes ? `- Notları (en yeni önce):\n${notes}\nNotlardaki istekleri her seçenekte uygula (keşif seçeneğinde de); notlar tarz atamasıyla çelişirse nota uy.` : ""}`;
}
