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

/**
 * Reddedilen işlerin künyeleri. Bu klasör yalnızca `main`'de yaşar: panel bir işi
 * reddettiğinde künyenin bir kopyasını buraya yazar.
 *
 * Reddetmek dalı silmez. "Bunu istemiyorum" ile "bu iş yok olsun" aynı şey değil;
 * kayıt geri alınabilir olsun diye iş kendi dalında durmaya devam eder, panel
 * onu yalnızca bekleyenler listesinden çıkarır.
 */
const RED_KLASORU = "yayin/reddedilenler";

/**
 * Bir işi canlıya alan birleştirme commit'inin mesajı. GitHub'ın merges ucu bu
 * metni kendisi üretir; onaylanma tarihini ayrı bir yere yazmak yerine buradan
 * okuyoruz — canlıda olanın tek doğru kaynağı yine git tarihi.
 */
const BIRLESTIRME_MESAJI = /^Merge (is\/\S+) into main/;

/** Onay geçmişi için taranan commit sayısı. 100'lük iki sayfa. */
const GECMIS_SAYFA_ADEDI = 2;

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
};

/** Verilen bir karar: canlıya alınmış ya da reddedilmiş bir iş. */
export type Karar = {
  dal: string;
  baslik: string;
  aciklama: string;
  tip: DegisiklikTipi | null;
  /** Kararın verildiği an. */
  tarih: string;
  /** Yalnızca reddedilenlerde, kullanıcı yazdıysa. */
  sebep?: string | null;
};

export type YayinDurumu =
  | { kurulum: string }
  | {
      degisiklikler: Degisiklik[];
      onaylananlar: Karar[];
      reddedilenler: Karar[];
      /**
       * Okunamayan şeyler. Boş değilse ekrandaki liste eksik olabilir, o yüzden
       * "bekleyen iş yok" demeye hakkımız yok.
       */
      uyarilar: string[];
      repo: string;
    };

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

type Ref = { ref: string; object: { sha: string } };

/** Dosyanın metni ve sha'sı. Sha yalnızca üzerine yazarken/silerken gerekiyor. */
type Dosya = { metin: string; sha: string };

async function dosyaOku(
  repo: string,
  token: string,
  yol: string,
  ref: string,
): Promise<Dosya | null> {
  const yanit = await github(
    `/repos/${repo}/contents/${yol}?ref=${encodeURIComponent(ref)}`,
    token,
  );
  if (!yanit.ok) return null;

  try {
    const govde = (await yanit.json()) as { content?: string; sha?: string };
    if (!govde.content || !govde.sha) return null;
    return {
      metin: Buffer.from(govde.content, "base64").toString("utf8"),
      sha: govde.sha,
    };
  } catch {
    return null;
  }
}

function slugu(dal: string): string {
  return dal.slice(IS_DALI_ONEKI.length);
}

function redYolu(dal: string): string {
  return `${RED_KLASORU}/${slugu(dal)}.json`;
}

async function kaydiGetir(
  repo: string,
  token: string,
  dal: string,
  ref: string = dal,
): Promise<Kayit | null> {
  const dosya = await dosyaOku(
    repo,
    token,
    `${KAYIT_KLASORU}/${slugu(dal)}.json`,
    ref,
  );
  if (!dosya) return null;

  try {
    return JSON.parse(dosya.metin) as Kayit;
  } catch {
    // Bozuk kayıt işin tamamını gizlemesin: açıklama düşer, iş listede kalır.
    return null;
  }
}

/** Reddedilen işin `main`'e yazılan künyesi. */
type RedKaydi = Kayit & { dal: string; tarih: string; sebep: string | null };

type DizinGirdisi = { name: string; type: string };

/**
 * Reddedilenler. Klasör yoksa (henüz kimse bir şey reddetmemişse) boş liste —
 * bu bir hata değil.
 */
async function redKayitlari(repo: string, token: string): Promise<Karar[]> {
  const yanit = await github(
    `/repos/${repo}/contents/${RED_KLASORU}?ref=${CANLI_DALI}`,
    token,
  );
  if (!yanit.ok) return [];

  let girdiler: DizinGirdisi[];
  try {
    girdiler = (await yanit.json()) as DizinGirdisi[];
    if (!Array.isArray(girdiler)) return [];
  } catch {
    return [];
  }

  const kayitlar = await Promise.all(
    girdiler
      .filter((g) => g.type === "file" && g.name.endsWith(".json"))
      .map(async (g): Promise<Karar | null> => {
        const dosya = await dosyaOku(
          repo,
          token,
          `${RED_KLASORU}/${g.name}`,
          CANLI_DALI,
        );
        if (!dosya) return null;
        try {
          const kayit = JSON.parse(dosya.metin) as RedKaydi;
          return {
            dal: kayit.dal,
            baslik: kayit.baslik,
            aciklama: kayit.aciklama,
            tip: kayit.tip ?? null,
            tarih: kayit.tarih,
            sebep: kayit.sebep ?? null,
          };
        } catch {
          return null;
        }
      }),
  );

  return kayitlar
    .filter((k): k is Karar => k !== null)
    .sort((a, b) => b.tarih.localeCompare(a.tarih));
}

type Commit = {
  sha: string;
  commit: { message: string; committer: { date: string } };
};

/**
 * `main`'in son commit'leri. Hem onay geçmişi hem de "bu iş zaten canlıda mı"
 * sorusu buradan cevaplanıyor: liste bir dalın atalarını da içerdiği için, bir
 * dalın ucu bu listedeyse o iş canlıya çoktan girmiş demektir.
 *
 * Yalnızca son birkaç yüz commit taranıyor; panel "ne oldu" sorusunun cevabı,
 * deponun tamamının dökümü değil.
 */
async function anaDalCommitleri(
  repo: string,
  token: string,
): Promise<{ commitler: Commit[]; eksikSayfa: boolean }> {
  const yanitlar = await Promise.all(
    Array.from({ length: GECMIS_SAYFA_ADEDI }, (_, i) =>
      github(`/repos/${repo}/commits?sha=${CANLI_DALI}&per_page=100&page=${i + 1}`, token),
    ),
  );

  const commitler: Commit[] = [];
  let eksikSayfa = false;
  for (const yanit of yanitlar) {
    if (!yanit.ok) {
      eksikSayfa = true;
      continue;
    }
    try {
      const sayfa = (await yanit.json()) as Commit[];
      if (Array.isArray(sayfa)) commitler.push(...sayfa);
      else eksikSayfa = true;
    } catch {
      // Okunamayan sayfa geçmişi kısaltır, ekranı boşaltmaz.
      eksikSayfa = true;
    }
  }

  return { commitler, eksikSayfa };
}

/**
 * Canlıya alınmış işler: `main`'deki birleştirme commit'leri. Onay tarihi de
 * oradan geliyor, çünkü onay tam olarak o commit'in atıldığı andır.
 */
async function onayKayitlari(
  repo: string,
  token: string,
  commitler: Commit[],
): Promise<Karar[]> {
  // Commit'ler yeniden eskiye sıralı geliyor. Aynı dal iki kez birleştiyse
  // ilk gördüğümüz, yani en son onay geçerli.
  const gorulen = new Set<string>();
  const birlesmeler: { dal: string; tarih: string }[] = [];
  for (const c of commitler) {
    const eslesme = BIRLESTIRME_MESAJI.exec(c.commit.message);
    if (!eslesme || gorulen.has(eslesme[1])) continue;
    gorulen.add(eslesme[1]);
    birlesmeler.push({ dal: eslesme[1], tarih: c.commit.committer.date });
  }

  return Promise.all(
    birlesmeler.map(async ({ dal, tarih }): Promise<Karar> => {
      // Künye canlıya birleşince `main`'e taşınmış oluyor; dalın kendisi
      // silindiği için onu oradan okuyoruz.
      const kayit = await kaydiGetir(repo, token, dal, CANLI_DALI);
      return {
        dal,
        baslik: kayit?.baslik ?? dal,
        aciklama: kayit?.aciklama ?? "",
        tip: kayit?.tip ?? null,
        tarih,
      };
    }),
  );
}

/** Bir commit'in özeti ve tarihi. Dalın ucunu tarihlendirmek için. */
async function commitOku(
  repo: string,
  token: string,
  sha: string,
): Promise<Commit | null> {
  const yanit = await github(`/repos/${repo}/commits/${sha}`, token);
  if (!yanit.ok) return null;

  try {
    const govde = (await yanit.json()) as Commit;
    return govde.commit?.committer?.date ? govde : null;
  } catch {
    return null;
  }
}

/**
 * Panelin gördüğü her şey: bekleyen işler, canlıya alınanlar, reddedilenler.
 *
 * Bekleyenlerin sıralaması yalnızca sunum için: aralarında bağımlılık yok,
 * hangisi önce onaylanırsa o gider.
 *
 * Buradaki kural: bir iş yalnızca hakkında **karar verildiği için** listeden
 * düşer — canlıya alınmıştır ya da reddedilmiştir. Okunamamak karar değildir.
 * Künyesi, tarihi, hatta hiçbir şeyi okunamayan bir dal yine de listede kalır;
 * eksik kalan ne varsa `uyarilar`a yazılır. Aksi halde ekran, aslında bekleyen
 * işler varken "bekleyen iş yok" der ki bu, verebileceği en kötü cevaptır.
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

  let dallar: { dal: string; sha: string }[];
  try {
    dallar = ((await dalYaniti.json()) as Ref[]).map((r) => ({
      dal: r.ref.replace("refs/heads/", ""),
      sha: r.object.sha,
    }));
  } catch {
    return {
      kurulum:
        "GitHub'ın verdiği dal listesi okunamadı. Biraz sonra tekrar deneyin.",
    };
  }

  const uyarilar: string[] = [];

  const [{ commitler, eksikSayfa }, reddedilenler] = await Promise.all([
    anaDalCommitleri(repo, token),
    redKayitlari(repo, token),
  ]);
  if (eksikSayfa) {
    uyarilar.push("Canlının geçmişi tam okunamadı; aşağıdaki liste eksik olabilir.");
  }

  const onaylananlar = await onayKayitlari(repo, token, commitler);
  const reddedilenDallar = new Set(reddedilenler.map((k) => k.dal));
  // Bir dalın ucu canlının geçmişindeyse o iş zaten canlıda. Commit listesi
  // atalarıyla birlikte geliyor, yani birleşmiş her dalın ucu burada bulunur.
  const canlidakiler = new Set(commitler.map((c) => c.sha));

  // Dallar birbirinden bağımsız, o yüzden hepsi aynı anda sorulabilir.
  const sonuclar = await Promise.all(
    dallar.map(async ({ dal, sha }): Promise<Degisiklik | null> => {
      // Reddedilen iş dalında duruyor ama beklemiyor: karar verildi.
      if (reddedilenDallar.has(dal)) return null;
      // Birleşmiş ama silinmemiş dal: canlıda zaten var, listelemeye gerek yok.
      if (canlidakiler.has(sha)) return null;

      const [kayit, sonCommit] = await Promise.all([
        kaydiGetir(repo, token, dal),
        commitOku(repo, token, sha),
      ]);

      if (!kayit) {
        uyarilar.push(`"${dal}" işinin açıklaması okunamadı.`);
      }

      return {
        dal,
        baslik:
          kayit?.baslik ?? sonCommit?.commit.message.split("\n")[0] ?? dal,
        aciklama: kayit?.aciklama ?? "",
        dikkat: kayit?.dikkat ?? null,
        tip: kayit?.tip ?? null,
        // Tarihi de okuyamadıysak iş yine listede kalsın: sıralaması bozulur,
        // görünmez olması ise onu canlıya alınamaz yapardı.
        tarih: sonCommit?.commit.committer.date ?? new Date().toISOString(),
      };
    }),
  );

  const degisiklikler = sonuclar
    .filter((d): d is Degisiklik => d !== null)
    .sort((a, b) => a.tarih.localeCompare(b.tarih));

  return { degisiklikler, onaylananlar, reddedilenler, uyarilar, repo };
}

/**
 * Bir işi reddeder: künyesinin bir kopyasını `main`'e, reddedilenler klasörüne
 * yazar.
 *
 * Dal silinmiyor. Karar geri alınabilir olsun diye iş yerinde duruyor; panel
 * onu yalnızca bu kayıt yüzünden bekleyenler listesinden çıkarıyor.
 */
export async function reddet(dal: string, sebep: string | null): Promise<void> {
  const yapilandirma = ayarlar();
  if (!yapilandirma) throw new Error("GitHub ayarları eksik.");
  const { repo, token } = yapilandirma;

  const kayit = await kaydiGetir(repo, token, dal);
  const govde: RedKaydi = {
    dal,
    tip: kayit?.tip ?? "iyilestirme",
    baslik: kayit?.baslik ?? dal,
    aciklama: kayit?.aciklama ?? "",
    dikkat: kayit?.dikkat ?? null,
    sebep,
    tarih: new Date().toISOString(),
  };

  const yol = redYolu(dal);
  // Aynı iş daha önce reddedilip geri alınmışsa dosya duruyor olabilir; GitHub
  // üzerine yazmak için eski sürümün sha'sını istiyor.
  const mevcut = await dosyaOku(repo, token, yol, CANLI_DALI);

  const yanit = await github(`/repos/${repo}/contents/${yol}`, token, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      branch: CANLI_DALI,
      message: `Reject ${dal}`,
      content: Buffer.from(JSON.stringify(govde, null, 2) + "\n", "utf8").toString(
        "base64",
      ),
      ...(mevcut ? { sha: mevcut.sha } : {}),
    }),
  });

  if (!yanit.ok) throw new Error(`İş reddedilemedi (HTTP ${yanit.status}).${await detayOku(yanit)}`);
}

/** Reddi geri alır: kaydı siler, iş yeniden bekleyenler listesine düşer. */
export async function reddiGeriAl(dal: string): Promise<void> {
  const yapilandirma = ayarlar();
  if (!yapilandirma) throw new Error("GitHub ayarları eksik.");
  const { repo, token } = yapilandirma;

  const yol = redYolu(dal);
  const mevcut = await dosyaOku(repo, token, yol, CANLI_DALI);
  // Kayıt yoksa istenen sonuç zaten sağlanmış.
  if (!mevcut) return;

  const yanit = await github(`/repos/${repo}/contents/${yol}`, token, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      branch: CANLI_DALI,
      message: `Restore ${dal} to the release list`,
      sha: mevcut.sha,
    }),
  });

  if (!yanit.ok) throw new Error(`Karar geri alınamadı (HTTP ${yanit.status}).${await detayOku(yanit)}`);
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
