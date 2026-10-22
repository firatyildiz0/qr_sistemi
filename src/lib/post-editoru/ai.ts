import Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { fixCaption as fixCaptionBase } from "./caption";
import { db, type EditorKullanicisi } from "./erisim";
import { geminiYapilandirildi, gorselUret, type Oran } from "./gemini";
import * as Tarz from "./tarz";
import { bufferKaydet, kaynakOku } from "./yukle";

/**
 * "AI ile post üret" ve postun tek bir öğesini "AI ile yeniden üret".
 *
 * Yerel editörde bunu `claude -p` oturumu yapıyordu; burada Claude API. İstemler
 * aynı — kullanıcının yıllarca ayıkladığı "yapay zekâ gibi yazma" kuralları
 * onlarda. Fark görselde: Canva/ElevenLabs bağlayıcıları API'de yok; görsel
 * ya kütüphaneden seçiliyor ya da Gemini ile üretiliyor (gemini.ts).
 *
 * Üretim bir dakikayı bulabiliyor. İstek işi kaydedip hemen dönüyor, üretim
 * yanıt gittikten sonra (`after`) sürüyor; editör durumu yokluyor. Pencere
 * kapansa da iş bitiyor ve sonuç bekliyor.
 */

const MODEL = "claude-opus-5-5";
/** Bir iş en fazla bu kadar "sürüyor" görünür; uç zaman aşımına uğrarsa iş askıda kalmasın. */
const IS_OMRU_SN = 330;

export const SECTORS: Record<string, string> = {
  gelinlik: "Gelinlik & abiye kiralama işletmeleri",
  kina: "Kına, bindallı & kaftan kiralama işletmeleri",
  kamera: "Kamera & ekipman kiralama işletmeleri",
  bisiklet: "Bisiklet & scooter kiralama işletmeleri",
  kamp: "Kamp & outdoor ekipman kiralama işletmeleri",
  genel: "Tüm kiralama işletmeleri",
};

const BRAND = `RentQR: kiralama işletmeleri için QR etiketli ürün ve rezervasyon yönetimi (qrsistemi.vercel.app). Her ürüne bir QR etiket yapıştırılır;
telefonla okutunca ürünün takvimi, geçmişi ve yeni rezervasyon tek ekranda açılır. Çakışan rezervasyonu engeller, teslim/iade
hatırlatır, kargo-temizlik-ütü günlerini takvime işler, uygulama indirme ve eğitim gerektirmez.`;
const TONE = `Son müşteriye değil, işletme sahibine konuş.
Ton: samimi ama profesyonel, "siz" hitabı, abartısız. Gerçek bir sorunu ya da anı yakala, RentQR'ı çözüm olarak göster.`;
// Kullanıcı "yapay zekâ yazmış gibi" duran kalıpları ve uydurma ayrıntıları istemedi (2026-10-11).
const HUMAN = `DOĞAL YAZ — bir kiralama işletmesi sahibinin meslektaşına konuşması gibi; reklam ajansı ya da yapay zekâ gibi değil:
- Kısa, düz, günlük cümleler. Süslü sıfat ve slogan dili yok ("kusursuz", "zahmetsiz", "tek tıkla", "devrim", "hayatınızı kolaylaştırır",
  "… son verin", "… karmaşasına son", "artık … değil", "sadece … değil, aynı zamanda …").
- Yapay kalıplar yok: "Önce: / Sonra: / Sonuç:" etiketleri, iki noktalı başlık ("Defterden takvime: tek ekran"), üçlü sıralama
  ("hızlı, kolay ve güvenli"), aynı cümlede soru sorup cevaplama, uzun tire (—), ünlem işareti.
- Uydurma ayrıntı yok: saat ("09:40"), kişi adı ("Mert K."), süre/hız iddiası ("10 saniyede"), yüzde, istatistik, müşteri sayısı.
  Yalnızca RentQR'ın gerçekten yaptığını söyle (yukarıdaki tanım) ve yalnızca hedef sektöre uyan ayrıntıyı kullan
  (ör. kamera ya da bisiklet için ütü, gelinlik için şarj yok).`;
const TR_CHECK =
  'Türkçe yazımı kontrol et: harf tekrarı, eksik/yanlış harf (ı/i, ş, ğ, ü, ö, ç), â/ã karışması olmasın. Fiil ve ek uyumuna dikkat ("etiketi okutun"; "etikete okutun" değil).';

// Öğe başına metin kuralları: post üretimi ve "AI ile yeniden üret" aynı kuralları kullanır.
const RULES: Record<string, string> = {
  tag: 'kitle etiketi, en fazla 45 karakter (ör. "Kamera & ekipman kiralama işletmeleri için").',
  headline: "en fazla 60 karakter; tam olarak bir vurgulu bölüm *yıldız içinde* olsun.",
  sub: "90-150 karakter; tam olarak bir önemli kısım **çift yıldız içinde** olsun.",
  list: "3 kısa madde (her biri en fazla 24 karakter).",
  notif: '{ "small": "RentQR · yarın teslim", "title": "Ürün adı" } — telefon bildirimi gibi; kişi adı ve saat yazma.',
  bubble: '{ "meta": "Müşteri", "text": "müşterinin kısa sorusu" } — WhatsApp mesajı gibi; kişi adı ve saat yazma.',
  strip: '4-5 adım { "t": "Kargo", "c": "#140504" | "#d11414" | "#1f8a4c" } — süreç şeridi.',
  caption: `Instagram açıklaması (caption): kısa ve net, düz metin. Yapı tam olarak şu:
    1. Satır: 1-2 kısa cümle, toplam en fazla 160 karakter. İşletme sahibinin derdini ve RentQR'ın bunu nasıl çözdüğünü
       sade söyler; başlığı tekrar etmez. "Merhaba", "Bugün size…" gibi girişler yok.
    2. Satır: tek kısa çağrı, ör. "Ücretsiz denemek için profilimizdeki bağlantıya dokunun." Web adresi yazma.
    3. Satır (öncesinde boş satır): tam olarak 3 hashtag; ilki #RentQR, diğer ikisi sektöre özel Türkçe etiket, her kelimenin ilk harfi
       büyük (#GelinlikKiralama, #KameraKiralama).
    Toplam 150-280 karakter. Yıldız, markdown, emoji, @bahsetme ve "beğen/paylaş" çağrısı yok.`,
  cta: 'buton yazısı, en fazla 24 karakter, " →" ile biter (ör. "Ücretsiz deneyin →"). Ünlem yok.',
  text: "serbest metin; şu ankine yakın uzunlukta (±%30). Şu ankinde *yıldız* içinde vurgu varsa yenisinde de tam olarak bir tane olsun.",
};

type Foto = { src: string; name: string; cat: string };

function librarySteps(library: Foto[], current?: string) {
  const lib = library.map((p) => `- ${p.src} | ${p.cat} | ${p.name}`).join("\n");
  return `GÖRSEL — yeni görsel üretme. Aşağıdaki kütüphaneden sektöre ve konuya en uygun fotoğrafı seç; "photo" alanına src'yi aynen yaz.${current ? `\nŞu anki görseli (${current}) seçme.` : ""}
Kütüphane (src | kategori | ad):
${lib}`;
}

const LAYOUT_HINT: Record<string, string> = {
  sol: "metin sol tarafta; ürünü sağda olan fotoğraf",
  alt: "metin alt yarıda; ürünü üst kısımda olan fotoğraf",
  orta: "metin ortada, fotoğraf koyu bir örtünün altında kalır",
};

type PostIstegi = { sector: string; topic: string; existing: string[]; library: Foto[]; plan: Tarz.PlanItem[]; images: boolean };

async function buildPrompt(req: PostIstegi) {
  const sector = SECTORS[req.sector] || SECTORS.genel;
  const avoid =
    req.existing
      .filter(Boolean)
      .slice(0, 30)
      .map((h) => `- ${h}`)
      .join("\n") || "- (yok)";
  const plan = req.plan
    .map((s, i) => {
      const v = Tarz.voiceOf(s.voice)!;
      return `SEÇENEK ${i + 1}${s.role === "kesif" ? " (keşif: kullanıcının henüz az denediği tarz)" : ""}
  - Metin yaklaşımı: ${v.name} — ${v.desc}
  - Görünüm (bilgi için; renkleri editör uygular): ${Tarz.nameOf("palette", s.palette)}, ${LAYOUT_HINT[s.layout]}`;
    })
    .join("\n");
  const notes = await Tarz.promptNotes();

  return `RentQR için aynı hedef kitleye 3 farklı tarzda Instagram postu hazırla; kullanıcı birini seçecek ve seçimlerinden zevkini öğreneceğiz.
Bu otomatik bir görev: soru sorma, açıklama yazma, yalnızca istenen JSON'u döndür.

${BRAND}

Hedef kitle: ${sector}. Son müşteriye değil, işletme sahibine konuş; "siz" hitabı, abartısız. RentQR'ı çözüm olarak göster.
Konu: ${req.topic ? `${req.topic} (üç seçenek de bu konuda)` : "serbest — hedef kitlenin günlük bir derdini seç; seçenekler farklı dertleri ele alabilir"}

Şu başlıkları tekrar etme (benzerini de yazma):
${avoid}

${notes ? notes + "\n\n" : ""}TARZ PLANI — her seçenek kendi metin yaklaşımına harfiyen uysun; üç seçenek başlık kalıbı, açılış ve ritim olarak birbirine benzemesin:
${plan}

HER SEÇENEK İÇİN METİN KURALLARI
- tag: ${RULES.tag}
- headline: ${RULES.headline} Yazdıktan sonra karakterleri say; 60'ı aşan seçenek atılır.
- sub: ${RULES.sub}
- extra: genellikle "none" (sade tasarım). Yalnızca metin gerçekten madde istiyorsa "list": ${RULES.list}
- cta: ${RULES.cta}
- caption: ${RULES.caption}
  Açıklamanın tonu da seçeneğin metin yaklaşımına uysun.
- why: bu seçeneği diğerlerinden ayıran şey, tek kısa Türkçe cümle (en fazla 90 karakter).
- ${TR_CHECK}

${HUMAN}

${librarySteps(req.library)}
Her seçenek için ayrı seç; mümkünse üç seçenekte farklı fotoğraflar olsun. focus_x: fotoğrafın yatay odağı (0-100).
${req.images ? `Ayrıca her seçeneğin görseli bir görsel üretim modeliyle yeniden çizilecek: image_prompt alanına İngilizce, 2-3 cümlelik bir sahne tarifi yaz
(sektöre uygun tek bir kiralık ürün, seçeneğin konusuna uygun an; ışık ve kompozisyon ayrıca eklenecek). Üretim olmazsa kütüphane fotoğrafı kullanılır.\n` : ""}
ÇIKTI — son mesajın yalnızca şu JSON olsun (kod bloğu yok), options sırası TARZ PLANI sırasıyla aynı:
{"options":[{"tag":"","headline":"","sub":"","extra":"none","list":[],"cta":"Hemen başlayın →","caption":"","why":"","photo":"","focus_x":72${req.images ? ',"image_prompt":""' : ""}},
 …3 tane],"error":""}`;
}

/* ---------- "AI ile yeniden üret": postun tek bir öğesi ---------- */
const LABEL: Record<string, string> = {
  tag: "etiket",
  headline: "başlık",
  sub: "açıklama",
  cta: "buton yazısı",
  text: "serbest metin",
  list: "madde listesi",
  notif: "bildirim kartı",
  bubble: "mesaj balonu",
  strip: "süreç şeridi",
  caption: "Instagram açıklaması",
  bg: "arka plan görseli",
};
const SHAPE: Record<string, string> = {
  list: '["","",""]',
  notif: '{"small":"","title":""}',
  bubble: '{"meta":"","text":""}',
  strip: '[{"t":"","c":"#140504"}]',
};
const MAX_LEN: Record<string, number> = { tag: 45, headline: 60, sub: 150, cta: 24 };
const STRIP_COLORS = ["#140504", "#d11414", "#1f8a4c", "#c77d12"];

type RegenIstegi = {
  el: string;
  source?: unknown;
  style?: { visual?: unknown; layout?: unknown };
  post: Record<string, unknown>;
  current: unknown;
  avoid: unknown[];
  voice?: unknown;
  library: Foto[];
};

function buildRegenPrompt(req: RegenIstegi) {
  const head = `RentQR Instagram postundaki tek bir öğeyi yenile. Bu otomatik bir görev: soru sorma, açıklama yazma, yalnızca istenen JSON'u döndür.

${BRAND}

Hedef kitle: postun etiketinden ve içeriğinden anla. ${TONE}

POSTUN ŞU ANKİ İÇERİĞİ — konu budur; yenisi bu konudan kopmasın ve diğer öğelerle uyumlu olsun:
${JSON.stringify(req.post, null, 1)}
`;
  if (req.el === "bg" && req.source === "gemini")
    return `${head}
Arka plan görselini yenile: postun konusuna uygun, şu anki görselden${req.current ? ` ("${String(req.current)}")` : ""} belirgin biçimde farklı bir sahne
(farklı ürün, açı, kompozisyon ya da ortam). Görseli bir görsel üretim modeli çizecek; senin işin sahneyi tarif etmek.
- image_prompt: İngilizce, 2-4 cümle; sektöre uygun tek bir kiralık ürün sahnesi. Işık ve kompozisyon kuralları ayrıca eklenecek, sen yalnızca sahneyi anlat.
- photo_name: kısa Türkçe ad (en fazla 30 karakter).
- focus_x: ürünün yatay konumu (0-100).

ÇIKTI — son mesajın yalnızca şu JSON olsun (kod bloğu yok):
{"image_prompt":"","photo_name":"","focus_x":72,"error":""}`;
  if (req.el === "bg")
    return `${head}
Arka plan görselini yenile: postun konusuna uygun, şu anki görselden${req.current ? ` ("${String(req.current)}")` : ""} belirgin biçimde farklı bir sahne
(farklı ürün, açı, kompozisyon ya da ortam).

${librarySteps(req.library, typeof req.current === "string" ? req.current : undefined)}

ÇIKTI — son mesajın yalnızca şu JSON olsun (kod bloğu yok):
{"photo":"","focus_x":72,"error":""}`;

  const avoid = req.avoid.map((v) => `- ${typeof v === "string" ? v : JSON.stringify(v)}`).join("\n") || "- (yok)";
  // sınırlı öğede fazladan yazdır: sınırı aşanlar elenince 3 kalsın
  const shape = SHAPE[req.el] || '""';
  const n = MAX_LEN[req.el] ? 5 : 3;
  const voice = Tarz.voiceOf(req.voice);
  return `${head}${voice ? `Postun metin yaklaşımı: ${voice.name} — ${voice.desc} Seçeneklerden en az ikisi bu yaklaşıma uysun.\n` : ""}
YENİLENECEK ÖĞE: ${LABEL[req.el]}
Şu anki değeri: ${JSON.stringify(req.current)}
Kural: ${RULES[req.el]}
- Her seçenek bu kurala harfiyen uysun (karakter sınırı, yıldız sayısı); sınırı aşan seçenek atılır, yazdıktan sonra karakterleri say. Vurgu işaretleri: başlık ve serbest metinde tek yıldız *böyle*,
  alt metinde (sub) çift yıldız **böyle**; Instagram açıklaması dahil başka öğelerde yıldız kullanma.
- ${TR_CHECK} Uydurma deyim ya da anlamsız kelime öbeği kullanma; yazdığını bir kez yüksek sesle okur gibi kontrol et.
${HUMAN}
- ${n} seçenek yaz. Hepsi postun konusuyla ilgili olsun ama hem birbirinden hem şu ankinden belirgin biçimde farklı olsun
  (farklı açı: soru, rakam, sonuç, an, itiraz…). Şunları ve benzerlerini tekrar etme:
${avoid}

ÇIKTI — son mesajın yalnızca şu JSON olsun (kod bloğu yok):
{"options":[${Array(n).fill(shape).join(",")}],"error":""}`;
}

/* ---------- Claude'un döndürdüğünü doğrulama ---------- */
// Instagram sınırları burada garanti edilir; kullanıcı kısa açıklama istediği için hashtag en fazla 3
function fixCaption(v: string) {
  const lines = fixCaptionBase(v).split("\n");
  const i = lines.length - 1;
  if (lines[i].trim().startsWith("#"))
    lines[i] = lines[i]
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      // #kameraKiralama → #KameraKiralama
      .map((t) => "#" + t.charAt(1).toLocaleUpperCase("tr") + t.slice(2))
      .join(" ");
  return lines.join("\n");
}
const str = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";

// Seçeneği öğenin biçimine göre doğrular; uymayan seçenek atılır.
function cleanOption(el: string, v: unknown): unknown {
  switch (el) {
    case "list": {
      const a = Array.isArray(v) ? v.map((x) => str(x, 40)).filter(Boolean).slice(0, 4) : [];
      return a.length ? a : null;
    }
    case "strip": {
      const a = Array.isArray(v)
        ? v
            .filter((x) => isRec(x) && str(x.t, 24))
            .slice(0, 6)
            .map((x) => ({ t: str(x.t, 24), c: STRIP_COLORS.includes(x.c) ? x.c : "#140504" }))
        : [];
      return a.length ? a : null;
    }
    case "notif":
      return isRec(v) && str(v.small, 60) && str(v.title, 60) ? { small: str(v.small, 60), title: str(v.title, 60) } : null;
    case "bubble":
      return isRec(v) && str(v.meta, 40) && str(v.text, 140) ? { meta: str(v.meta, 40), text: str(v.text, 140) } : null;
    case "caption":
      return str(v, 5000) && fixCaption(v as string);
    // editör başlıkta *tek*, açıklamada **çift** yıldız bekler; karışanı düzelt
    case "headline":
    case "text":
      return str(v, 300)?.replace(/\*\*(.+?)\*\*/g, "*$1*") ?? null;
    case "sub":
      return str(v, 300)?.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, "$1**$2**") ?? null;
    case "tag":
    case "cta":
      return str(v, 60)?.replace(/\*/g, "") ?? null;
    default:
      return str(v, 300);
  }
}

const focusX = (v: unknown) => (Number.isFinite(+(v as number)) ? Math.min(100, Math.max(0, +(v as number))) : 72);

function parseJson(text: string): Record<string, unknown> {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b < a) throw new Error("Claude geçerli bir yanıt döndürmedi.");
  return JSON.parse(text.slice(a, b + 1));
}

/* ---------- Claude ---------- */
const SYSTEM_PROMPT =
  "Sen RentQR post editörünün içerik üretim yardımcısısın. Kullanıcı mesajındaki adımları ve kuralları eksiksiz uygula; " +
  "yanıtını yalnızca istenen biçimde (JSON) ver, açıklama ekleme.";

let istemci: Anthropic | null = null;
const anthropic = () => (istemci ??= new Anthropic({ timeout: 140_000, maxRetries: 1 }));

export const aiYapilandirildi = () => Boolean(process.env.ANTHROPIC_API_KEY);

async function claude(prompt: string): Promise<Record<string, unknown>> {
  try {
    // Bir güvenlik sınıflandırıcısı reddederse istek aynı çağrıda uygun modelde
    // yeniden çalışıyor (server-side fallback); kullanıcı boş elle dönmüyor.
    const msg = await anthropic()
      .beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      })
      .finalMessage();

    if (msg.stop_reason === "refusal") throw new Error("Claude bu isteği yanıtlamadı. Konuyu değiştirip tekrar dene.");
    if (msg.stop_reason === "max_tokens") throw new Error("Claude'un yanıtı yarıda kesildi. Tekrar dene.");

    const u = msg.usage;
    console.info("[post-editoru] claude", {
      model: msg.model,
      girdi: u.input_tokens,
      cikti: u.output_tokens,
      onbellek_okuma: u.cache_read_input_tokens ?? 0,
    });

    return parseJson(msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(""));
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new Error("Claude API anahtarı geçersiz.");
    if (err instanceof Anthropic.RateLimitError) throw new Error("Claude şu an çok yoğun. Bir dakika sonra tekrar dene.");
    if (err instanceof Anthropic.APIConnectionError) throw new Error("Claude'a ulaşılamadı. Tekrar dene.");
    if (err instanceof Anthropic.APIError) {
      console.error("[post-editoru] claude hatası", err.status, err.message);
      throw new Error(`Claude hatası (${err.status ?? "bağlantı"}). Tekrar dene.`);
    }
    throw err;
  }
}

/* ---------- işler ---------- */
type IsDurumu = "running" | "done" | "error" | "cancelled";

async function isAc(
  me: EditorKullanicisi,
  tur: string,
  asama: string,
  calis: (asamaYaz: (a: string) => Promise<unknown>) => Promise<unknown>
) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const { error } = await db().from("post_editoru_isler").insert({ id, tur, asama, kullanici: me.id });
  if (error) throw new Error(`İş başlatılamadı: ${error.message}`);
  // editörün ilerleme satırında görünen aşama ("Görseller üretiliyor")
  const asamaYaz = async (a: string) => db().from("post_editoru_isler").update({ asama: a }).eq("id", id).eq("durum", "running");

  after(async () => {
    // yalnızca hâlâ "sürüyor" ise yaz: kullanıcı bu arada durdurduysa sonuç atılır
    const bitir = (alan: { durum: IsDurumu; sonuc?: unknown; hata?: string; asama: string }) =>
      db()
        .from("post_editoru_isler")
        .update({ ...alan, bitti: new Date().toISOString() })
        .eq("id", id)
        .eq("durum", "running");
    try {
      await bitir({ durum: "done", sonuc: await calis(asamaYaz), asama: "Hazır" });
    } catch (e) {
      await bitir({ durum: "error", hata: String((e as Error)?.message || e).slice(0, 400), asama: "Hata" });
    }
  });
  return id;
}

export async function isDurumu(id: string) {
  const { data } = await db()
    .from("post_editoru_isler")
    .select("id, durum, asama, sonuc, hata, basladi")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const elapsed = Math.round((Date.now() - new Date(data.basladi).getTime()) / 1000);
  let durum = data.durum as IsDurumu;
  let hata = data.hata as string | null;
  if (durum === "running" && elapsed > IS_OMRU_SN) {
    durum = "error";
    hata = "Süre doldu. Tekrar dene.";
    await db().from("post_editoru_isler").update({ durum, hata }).eq("id", id).eq("durum", "running");
  }
  return { id: data.id, status: durum, stage: data.asama, elapsed, result: data.sonuc, error: hata };
}

export async function isIptal(id: string) {
  const { data } = await db().from("post_editoru_isler").select("id").eq("id", id).maybeSingle();
  if (!data) return false;
  await db().from("post_editoru_isler").update({ durum: "cancelled" }).eq("id", id).eq("durum", "running");
  return true;
}

function kutuphane(raw: unknown): Foto[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((p) => isRec(p) && typeof p.src === "string")
    .slice(0, 300)
    .map((p) => ({ src: String(p.src).slice(0, 300), name: String(p.name || "").slice(0, 80), cat: String(p.cat || "").slice(0, 60) }));
}

/** Aynı konu için 3 tarzda post. Seçeneklerin tarzını tarz.ts atar, Claude değil. */
export async function postUret(me: EditorKullanicisi, body: Record<string, unknown>) {
  if (typeof body.sector !== "string" || !SECTORS[body.sector]) throw new Error("Geçersiz sektör");
  const library = kutuphane(body.library);
  if (!library.length) throw new Error("Fotoğraf kütüphanesi eksik");
  const req: PostIstegi = {
    sector: body.sector,
    topic: String(body.topic || "").slice(0, 200),
    existing: (Array.isArray(body.existing) ? body.existing : []).filter((h): h is string => typeof h === "string"),
    library,
    plan: await Tarz.plan(),
    images: body.images === true,
  };
  if (req.images && !geminiYapilandirildi()) throw new Error("Görsel üretimi için GEMINI_API_KEY tanımlı değil. Kutuyu kaldırıp kütüphaneden devam edebilirsin.");
  const prompt = await buildPrompt(req);
  return isAc(me, "post", "3 farklı tarz yazılıyor", async (asamaYaz) => {
    const out = await claude(prompt);
    if (out.error) throw new Error(String(out.error));
    // bildirim kartı, mesaj balonu ve şerit şablon gibi durduğu için AI turunda kullanılmaz
    const EXTRAS = ["none", "list"];
    const raw = Array.isArray(out.options) ? out.options : [];
    const options = raw
      .slice(0, req.plan.length)
      .map((o: Record<string, unknown>, i: number) => {
        const headline = cleanOption("headline", o?.headline);
        if (!headline) return null;
        const { role, ...ids } = req.plan[i];
        const style = Tarz.cleanStyle(ids);
        return {
          style,
          role,
          labels: Object.fromEntries(Tarz.AXES.map((ax) => [ax, Tarz.nameOf(ax, style[ax])])),
          why: str(o.why, 140) || "",
          tag: cleanOption("tag", o.tag) || "",
          headline,
          sub: cleanOption("sub", o.sub) || "",
          cta: cleanOption("cta", o.cta) || "Hemen başlayın →",
          caption: (o.caption && cleanOption("caption", o.caption)) || "",
          extra: EXTRAS.includes(o.extra as string) ? o.extra : "none",
          list: cleanOption("list", o.list) || [],
          notif: cleanOption("notif", o.notif),
          bubble: cleanOption("bubble", o.bubble),
          strip: cleanOption("strip", o.strip) || [],
          photo: library.some((p) => p.src === o.photo) ? o.photo : library[i % library.length].src,
          focus_x: focusX(o.focus_x),
          image_prompt: str(o.image_prompt, 800),
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);
    if (!options.length) throw new Error("Claude kullanılabilir bir seçenek üretmedi. Tekrar dene.");

    if (req.images) {
      // üç görsel paralel; biri olmazsa o seçenek kütüphane fotoğrafıyla kalır
      await asamaYaz("Görseller Gemini ile üretiliyor");
      const sonuc = await Promise.allSettled(
        options.map(async (o) => {
          if (!o.image_prompt) return null;
          const g = await gorselUret(`${o.image_prompt}\n${Tarz.imageStyle(o.style.visual, o.style.layout)}`, { oran: "4:5" });
          return bufferKaydet(g.buf, g.mime);
        })
      );
      sonuc.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          options[i].photo = r.value;
          options[i].focus_x = 50;
        } else if (r.status === "rejected") console.error("[post-editoru] seçenek görseli üretilemedi", r.reason);
      });
    }
    return { options: options.map((o) => ({ ...o, image_prompt: undefined })) };
  });
}

/* ---------- Gemini: serbest görsel, görseli düzenleme, arka plan kaldırma ---------- */
const ORANLAR: Oran[] = ["1:1", "3:4", "4:5", "9:16", "16:9", "4:3"];

/** Kullanıcının yazdığı tariften görsel (Ekle → Görsel → AI ile üret). */
export async function gorselIsi(me: EditorKullanicisi, body: Record<string, unknown>) {
  if (!geminiYapilandirildi()) throw new Error("Görsel üretimi için GEMINI_API_KEY tanımlı değil.");
  const istem = String(body.prompt || "").trim().slice(0, 1500);
  if (istem.length < 3) throw new Error("Ne görmek istediğini birkaç kelimeyle yaz.");
  const oran = ORANLAR.includes(body.oran as Oran) ? (body.oran as Oran) : "1:1";
  const stil = typeof body.stil === "string" && body.stil ? `\n${Tarz.imageStyle(body.stil, "orta")}` : "";
  return isAc(me, "gorsel", "Görsel üretiliyor", async () => {
    const g = await gorselUret(istem + stil, { oran });
    return { src: await bufferKaydet(g.buf, g.mime), name: istem.slice(0, 40) };
  });
}

/**
 * Var olan görseli tarife göre düzenler. `kip: "arkaplan"` ürünü düz yeşil
 * zemine alır; saydam PNG'ye çevirme (yeşili silme) tarayıcıda yapılıyor,
 * çünkü model saydam görsel üretmiyor.
 */
export async function duzenlemeIsi(me: EditorKullanicisi, body: Record<string, unknown>, origin: string) {
  if (!geminiYapilandirildi()) throw new Error("Görsel düzenleme için GEMINI_API_KEY tanımlı değil.");
  const arkaplan = body.kip === "arkaplan";
  const istem = arkaplan
    ? "Keep the main subject exactly as it is (same shape, colors, details, position and size). Replace the entire background with a perfectly flat, uniform pure green (#00FF00) background. No shadows, no reflections, no gradients, no green tint on the subject."
    : String(body.prompt || "").trim().slice(0, 1500);
  if (!arkaplan && istem.length < 3) throw new Error("Görselde neyin değişeceğini yaz.");
  const kaynak = await kaynakOku(body.src, origin);
  return isAc(me, arkaplan ? "arkaplan" : "duzenle", arkaplan ? "Arka plan ayrılıyor" : "Görsel düzenleniyor", async () => {
    const g = await gorselUret(istem, { girdiler: [kaynak] });
    return { src: await bufferKaydet(g.buf, g.mime) };
  });
}

/** Postun tek öğesi için seçenekler; arka planda kütüphaneden başka bir fotoğraf ya da Gemini ile yeni görsel. */
export async function yenidenUret(me: EditorKullanicisi, body: Record<string, unknown>) {
  const el = String(body.el || "");
  if (!LABEL[el]) throw new Error("Geçersiz öğe");
  if (el === "bg" && body.source !== "library" && body.source !== "gemini") throw new Error("Geçersiz görsel kaynağı");
  if (el === "bg" && body.source === "gemini" && !geminiYapilandirildi()) throw new Error("Görsel üretimi için GEMINI_API_KEY tanımlı değil. Kütüphaneden seçebilirsin.");
  if (!isRec(body.post)) throw new Error("Post içeriği eksik");
  const req: RegenIstegi = {
    el,
    source: body.source,
    style: isRec(body.style) ? body.style : undefined,
    post: body.post,
    current: body.current,
    avoid: (Array.isArray(body.avoid) ? body.avoid : []).filter(Boolean).slice(0, 20),
    voice: body.voice,
    library: kutuphane(body.library),
  };
  if (el === "bg" && !req.library.length) throw new Error("Fotoğraf kütüphanesi eksik");
  const prompt = buildRegenPrompt(req);

  const gemini = el === "bg" && req.source === "gemini";
  return isAc(me, "regen", gemini ? "Görsel tarif ediliyor" : el === "bg" ? "Fotoğraf seçiliyor" : "Seçenekler yazılıyor", async (asamaYaz) => {
    const out = await claude(prompt);
    if (out.error) throw new Error(String(out.error));
    if (gemini) {
      const tarif = str(out.image_prompt, 1500);
      if (!tarif) throw new Error("Claude görsel tarifi yazmadı. Tekrar dene.");
      await asamaYaz("Görsel Gemini ile üretiliyor");
      const g = await gorselUret(`${tarif}\n${Tarz.imageStyle(req.style?.visual, req.style?.layout)}`, { oran: "4:5" });
      return { photo: await bufferKaydet(g.buf, g.mime), photo_name: str(out.photo_name, 40) || "AI görseli", focus_x: focusX(out.focus_x) };
    }
    if (el === "bg") {
      if (!req.library.some((p) => p.src === out.photo)) throw new Error("Claude kütüphaneden geçerli bir fotoğraf seçmedi.");
      return { photo: out.photo, focus_x: focusX(out.focus_x) };
    }
    const all = (Array.isArray(out.options) ? out.options : []).map((v) => cleanOption(el, v)).filter(Boolean);
    if (!all.length) throw new Error("Claude kullanılabilir bir seçenek üretmedi. Tekrar dene.");
    // karakter sınırını belirgin aşanları ele (hepsi aşıyorsa en kısası kalır)
    const max = MAX_LEN[el];
    const len = (v: unknown) => String(v).replace(/\*/g, "").length;
    const fit = max ? all.filter((v) => len(v) <= max * 1.1) : all;
    return { options: (fit.length ? fit : [all.reduce((a, b) => (len(a) <= len(b) ? a : b))]).slice(0, 3) };
  });
}
