/**
 * Yayın panelinin arka ucu: GitHub'ın kendisi.
 *
 * Her iş kendi dalında durur ve `main`'den ayrılır, yani birbirlerinin arkasında
 * sıra beklemezler — üçüncü işi canlıya almak için ilk ikisini göndermek
 * gerekmiyor. Tek bir sırada dizilseler bunu yapmanın yolu git tarihini yeniden
 * yazmaktan geçerdi; ayrı dallar aynı sonucu git'in kendi araçlarıyla veriyor.
 *
 * Ayrı bir tablo yok: hangi işin canlıda olduğu, dalın `main`'e birleşmiş olup
 * olmadığıdır. Bunun ikinci bir kopyasını tutmak yalnızca birbirinden kayan iki
 * kaynak üretirdi.
 */

const API = "https://api.github.com";

/** İş dallarının öneki. `is/qr-kodu` gibi. */
export const IS_DALI_ONEKI = "is/";

/** Canlı. Yalnızca bu panelden, bir işi birleştirerek ilerletilir. */
export const CANLI_DALI = "main";

/**
 * İşin Türkçe künyesi. Dosya adı dalın adından türüyor (`is/qr-kodu` →
 * `yayin/kayitlar/qr-kodu.json`), o yüzden eşleştirmek için ayrıca bir kimlik
 * taşımaya gerek yok.
 *
 * Her iş kendi dosyasını ekler; tek bir ortak listede toplansalardı iki dal
 * aynı dosyaya satır eklediği için her birleştirme çakışırdı.
 */
const KAYIT_KLASORU = "yayin/kayitlar";

export type DegisiklikTipi = "ozellik" | "hata" | "guvenlik" | "iyilestirme";

export type Kayit = {
  tip: DegisiklikTipi;
  baslik: string;
  aciklama: string;
  dikkat?: string | null;
};

export type Degisiklik = {
  dal: string;
  /** Kaydı yoksa son commit'in özeti kullanılır. */
  baslik: string;
  aciklama: string;
  dikkat: string | null;
  tip: DegisiklikTipi | null;
  tarih: string;
  commitAdedi: number;
};

export type YayinDurumu =
  | { kurulum: string }
  | { degisiklikler: Degisiklik[]; repo: string };

function ayarlar(): { repo: string; token: string } | null {
  const repo = process.env.GITHUB_REPO;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return null;
  return { repo, token };
}

async function github(
  yol: string,
  token: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(`${API}${yol}`, {
    ...init,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...init?.headers,
    },
    // Panelin işi "şu an ne bekliyor" sorusuna cevap vermek; bayat veri burada
    // yanlış cevaptır.
    cache: "no-store",
  });
}

/** GitHub'ın kendi açıklaması genelde asıl sebebi söyler; yutmuyoruz. */
async function detayOku(yanit: Response): Promise<string> {
  try {
    const govde = (await yanit.json()) as { message?: string };
    return govde.message ? ` GitHub şöyle diyor: “${govde.message}”` : "";
  } catch {
    return "";
  }
}

type Ref = { ref: string };
type Karsilastirma = {
  ahead_by: number;
  commits: { sha: string; commit: { message: string; committer: { date: string } } }[];
};

async function kaydiGetir(
  repo: string,
  token: string,
  dal: string,
): Promise<Kayit | null> {
  const slug = dal.slice(IS_DALI_ONEKI.length);
  const yanit = await github(
    `/repos/${repo}/contents/${KAYIT_KLASORU}/${slug}.json?ref=${encodeURIComponent(dal)}`,
    token,
  );
  if (!yanit.ok) return null;

  try {
    const govde = (await yanit.json()) as { content?: string };
    if (!govde.content) return null;
    return JSON.parse(Buffer.from(govde.content, "base64").toString("utf8")) as Kayit;
  } catch {
    // Bozuk kayıt işin tamamını gizlemesin: açıklama düşer, iş listede kalır.
    return null;
  }
}

/**
 * Canlıda olmayan işler.
 *
 * Sıralama yalnızca sunum için: aralarında bağımlılık yok, hangisi önce
 * onaylanırsa o gider.
 */
export async function yayinDurumu(): Promise<YayinDurumu> {
  const yapilandirma = ayarlar();
  if (!yapilandirma) {
    return {
      kurulum:
        "GITHUB_REPO ve GITHUB_TOKEN tanımlı değil. Bu ekran onlar olmadan çalışmaz.",
    };
  }
  const { repo, token } = yapilandirma;

  const dalYaniti = await github(
    `/repos/${repo}/git/matching-refs/heads/${IS_DALI_ONEKI}`,
    token,
  );
  if (dalYaniti.status === 404) {
    return {
      kurulum: `"${repo}" deposu bulunamadı. Erişim anahtarının bu depoya erişimi olduğundan emin olun.`,
    };
  }
  if (!dalYaniti.ok) {
    return {
      kurulum: `GitHub'a ulaşılamadı (HTTP ${dalYaniti.status}).${await detayOku(dalYaniti)}`,
    };
  }

  const dallar = ((await dalYaniti.json()) as Ref[]).map((r) =>
    r.ref.replace("refs/heads/", ""),
  );

  // Dallar birbirinden bağımsız, o yüzden hepsi aynı anda sorulabilir.
  const sonuclar = await Promise.all(
    dallar.map(async (dal): Promise<Degisiklik | null> => {
      const yanit = await github(
        `/repos/${repo}/compare/${CANLI_DALI}...${encodeURIComponent(dal)}`,
        token,
      );
      if (!yanit.ok) return null;

      const { ahead_by, commits } = (await yanit.json()) as Karsilastirma;
      // Birleşmiş ama silinmemiş dal: canlıda zaten var, listelemeye gerek yok.
      if (ahead_by === 0) return null;

      const kayit = await kaydiGetir(repo, token, dal);
      const sonCommit = commits[commits.length - 1];

      return {
        dal,
        baslik: kayit?.baslik ?? sonCommit.commit.message.split("\n")[0],
        aciklama: kayit?.aciklama ?? "",
        dikkat: kayit?.dikkat ?? null,
        tip: kayit?.tip ?? null,
        tarih: sonCommit.commit.committer.date,
        commitAdedi: ahead_by,
      };
    }),
  );

  const degisiklikler = sonuclar
    .filter((d): d is Degisiklik => d !== null)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  return { degisiklikler, repo };
}

/**
 * Bir işi canlıya alır: dalı `main`'e birleştirir.
 *
 * Birleşme başarılıysa dal silinir — canlıda olan bir iş listede beklemeye
 * devam etmemeli. Silme başarısız olursa iş yine de canlıdadır, o yüzden bu
 * adımın hatası yutuluyor: dal bir sonraki okumada zaten "ilerisi yok" diye
 * listeden düşer.
 */
export async function canliyaAl(dal: string): Promise<void> {
  const yapilandirma = ayarlar();
  if (!yapilandirma) throw new Error("GitHub ayarları eksik.");
  const { repo, token } = yapilandirma;

  const yanit = await github(`/repos/${repo}/merges`, token, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base: CANLI_DALI, head: dal }),
  });

  // 204: birleştirilecek bir şey kalmamış. Hedef zaten sağlanmış durumda.
  if (yanit.status === 201 || yanit.status === 204) {
    await github(`/repos/${repo}/git/refs/heads/${encodeURIComponent(dal)}`, token, {
      method: "DELETE",
    }).catch(() => {});
    return;
  }

  const detay = await detayOku(yanit);

  if (yanit.status === 409) {
    throw new Error(
      "Bu iş tek başına canlıya alınamıyor: canlıdaki kodla çakışıyor, yani araya giren başka bir değişiklikle aynı satırlara dokunuyor. Bana söyleyin, işi canlının güncel hali üzerine taşıyıp yeniden göndereyim.",
    );
  }
  if (yanit.status === 403 || yanit.status === 401) {
    throw new Error(
      `GitHub anahtarı bu depoya yazamıyor. Fine-grained token'da "Contents" izni "Read and write" olmalı; korumalı bir dal da aynı cevabı verir.${detay}`,
    );
  }
  if (yanit.status === 404) {
    throw new Error(
      `"${dal}" dalı bulunamadı. Bu iş başka bir yerden canlıya alınmış olabilir — sayfayı yenileyin.${detay}`,
    );
  }
  throw new Error(`Canlıya alınamadı (HTTP ${yanit.status}).${detay}`);
}
