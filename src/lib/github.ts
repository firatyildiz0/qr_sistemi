/**
 * Yayın panelinin arka ucu: GitHub'ın kendisi.
 *
 * Ayrı bir tablo tutmuyoruz, çünkü tutulacak veri zaten git'te var — hangi
 * commit'in canlıya çıktığı `main`'in nerede durduğudur, başka bir yerde
 * kopyasını tutmak iki kaynağın birbirinden kaymasına davetiye.
 *
 * Değişikliklerin Türkçe başlık ve açıklamaları `yayin/kayitlar.json` içinde,
 * `staging` dalında duruyor; commit'lerle sha üzerinden eşleşiyor.
 */

const API = "https://api.github.com";

/** İşin biriktiği dal. Buraya push etmek canlıya çıkmak değildir. */
export const YAYIN_DALI = "staging";

/** Canlı. Yalnızca bu paneldeki onayla ileri alınır. */
export const CANLI_DALI = "main";

const KAYIT_YOLU = "yayin/kayitlar.json";

/**
 * Kaydı commit'e bağlayan satır, commit mesajının sonunda durur:
 *
 *     Panel-Kaydi: 2026-08-01-yayin-ekrani
 *
 * sha ile eşleştirmek mümkün değil — bir commit'in sha'sı ancak o commit
 * atıldıktan sonra bilinir, kaydın kendisi ise o commit'in içinde.
 */
const KAYIT_ETIKETI = /^Panel-Kaydi:\s*(\S+)\s*$/m;

export type DegisiklikTipi = "ozellik" | "hata" | "guvenlik" | "iyilestirme";

export type Kayit = {
  id: string;
  tip: DegisiklikTipi;
  baslik: string;
  aciklama: string;
  dikkat?: string | null;
};

export type Degisiklik = {
  sha: string;
  kisaSha: string;
  tarih: string;
  /** Kaydı yoksa commit'in kendi özeti kullanılır. */
  baslik: string;
  aciklama: string;
  dikkat: string | null;
  tip: DegisiklikTipi | null;
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
    // Panelin işi tam olarak "şu an ne bekliyor" sorusuna cevap vermek;
    // burada bayat veri yanlış cevaptır.
    cache: "no-store",
  });
}

type CompareYaniti = {
  commits: { sha: string; commit: { message: string; committer: { date: string } } }[];
};

/** `yayin/kayitlar.json` — dosya henüz yoksa boş liste. */
async function kayitlariGetir(repo: string, token: string): Promise<Map<string, Kayit>> {
  const yanit = await github(
    `/repos/${repo}/contents/${KAYIT_YOLU}?ref=${YAYIN_DALI}`,
    token,
  );
  if (!yanit.ok) return new Map();

  try {
    const govde = (await yanit.json()) as { content?: string };
    if (!govde.content) return new Map();
    const metin = Buffer.from(govde.content, "base64").toString("utf8");
    const veri = JSON.parse(metin) as { kayitlar?: Kayit[] };
    return new Map((veri.kayitlar ?? []).map((k) => [k.id, k]));
  } catch {
    // Bozuk JSON panelin tamamını götürmesin: açıklamalar düşer, commit'ler kalır.
    return new Map();
  }
}

/**
 * `main`'de olmayıp `staging`'de olan commit'ler — eskiden yeniye.
 *
 * Sıra GitHub'ın verdiği sıra, yani git'in kendi tarihi. Panel bunu bozmuyor:
 * canlı ancak bu listede bir noktaya kadar ilerletilebilir.
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

  const yanit = await github(
    `/repos/${repo}/compare/${CANLI_DALI}...${YAYIN_DALI}`,
    token,
  );

  if (yanit.status === 404) {
    return {
      kurulum: `GitHub'da "${YAYIN_DALI}" dalı ya da "${repo}" deposu bulunamadı. Anahtarın bu depoya erişimi olduğundan emin ol.`,
    };
  }
  if (!yanit.ok) {
    return { kurulum: `GitHub'a ulaşılamadı (HTTP ${yanit.status}).` };
  }

  const { commits } = (await yanit.json()) as CompareYaniti;
  const kayitlar = await kayitlariGetir(repo, token);

  const degisiklikler = commits.map((c): Degisiklik => {
    const id = c.commit.message.match(KAYIT_ETIKETI)?.[1];
    const kayit = id ? kayitlar.get(id) : undefined;
    return {
      sha: c.sha,
      kisaSha: c.sha.slice(0, 7),
      tarih: c.commit.committer.date,
      baslik: kayit?.baslik ?? c.commit.message.split("\n")[0],
      aciklama: kayit?.aciklama ?? "",
      dikkat: kayit?.dikkat ?? null,
      tip: kayit?.tip ?? null,
    };
  });

  return { degisiklikler, repo };
}

/**
 * Canlıyı `sha`'ya ilerletir.
 *
 * `force` yok: GitHub yalnızca ileri sarmaya (fast-forward) izin verir, yani
 * canlıda olan bir şey bu yolla asla kaybolamaz. Reddedilen bir istek
 * "canlı beklediğim yerde değil" demektir ve okunması gereken bir uyarıdır.
 */
export async function canliyiIlerlet(sha: string): Promise<void> {
  const yapilandirma = ayarlar();
  if (!yapilandirma) throw new Error("GitHub ayarları eksik.");
  const { repo, token } = yapilandirma;

  const yanit = await github(`/repos/${repo}/git/refs/heads/${CANLI_DALI}`, token, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sha, force: false }),
  });

  if (yanit.ok) return;

  if (yanit.status === 422) {
    throw new Error(
      "GitHub bu değişikliği ileri sarma olarak kabul etmedi. Canlı, beklenenden farklı bir noktada olabilir — sayfayı yenileyip tekrar bak.",
    );
  }
  if (yanit.status === 403 || yanit.status === 401) {
    throw new Error("GitHub anahtarının bu depoya yazma yetkisi yok.");
  }
  throw new Error(`Gönderilemedi (HTTP ${yanit.status}).`);
}
