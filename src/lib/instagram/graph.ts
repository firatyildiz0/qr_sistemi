/**
 * Instagram Graph API'sine giden tek kapı.
 *
 * Buradan geçen her isteğin üç sorunu peşinen çözülmüş olmalı, çünkü karşı
 * taraf bizim sunucumuz değil:
 *
 * 1. **Zaman aşımı.** Cevapsız kalan bir istek webhook işlemeyi kilitler ve
 *    Meta 20 saniye içinde 200 alamazsa aynı olayı tekrar gönderir. Her
 *    isteğin kendi süre sınırı var.
 * 2. **Geçici hatalar.** 5xx ve ağ hataları tekrar deneniyor, artan beklemeyle.
 *    4xx tekrar denenmiyor — istek yanlışsa ikincisi de yanlış olur.
 * 3. **Sessiz başarısızlık.** Mesaj gidemediyse çağıran taraf bunu öğreniyor;
 *    müşteriye cevap yazdığını sanıp yazmamak, bu akıştaki en kötü hata olurdu.
 */

const SURUM = "v23.0";
const TABAN = `https://graph.instagram.com/${SURUM}`;

/** Tek mesajın sınırı 1000 karakter; uzun özet parçalara bölünüyor. */
const MAX_UZUNLUK = 900;
const ZAMAN_ASIMI_MS = 10_000;
const DENEME = 3;

export type HizliCevap = { baslik: string; yuk: string };

export type GonderimSonucu = { ok: true } | { ok: false; hata: string };

function bekle(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Metni Instagram'ın kabul ettiği uzunluğa böler. Bölme satır sonlarından
 * yapılıyor: özet mesajı ortasından kesilmiş bir satırla başlamasın.
 */
export function parcala(metin: string): string[] {
  if (metin.length <= MAX_UZUNLUK) return [metin];

  const parcalar: string[] = [];
  let kalan = metin;

  while (kalan.length > MAX_UZUNLUK) {
    const pencere = kalan.slice(0, MAX_UZUNLUK);
    const kesme = pencere.lastIndexOf("\n");
    const nokta = kesme > MAX_UZUNLUK / 2 ? kesme : MAX_UZUNLUK;
    parcalar.push(kalan.slice(0, nokta).trimEnd());
    kalan = kalan.slice(nokta).trimStart();
  }

  if (kalan) parcalar.push(kalan);
  return parcalar;
}

type IstekGovdesi = Record<string, unknown>;

async function istek(
  yol: string,
  token: string,
  govde: IstekGovdesi
): Promise<GonderimSonucu> {
  let sonHata = "Bilinmeyen hata";

  for (let deneme = 1; deneme <= DENEME; deneme += 1) {
    try {
      const cevap = await fetch(`${TABAN}${yol}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(govde),
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
        cache: "no-store",
      });

      if (cevap.ok) return { ok: true };

      const metin = await cevap.text().catch(() => "");
      sonHata = `${cevap.status} ${metin.slice(0, 300)}`;

      // İstemci hatası: token geçersiz, alıcı yanlış, 24 saatlik pencere
      // kapanmış. Tekrar denemek aynı cevabı getirir.
      if (cevap.status < 500 && cevap.status !== 429) {
        return { ok: false, hata: sonHata };
      }
    } catch (err) {
      sonHata = (err as Error).message;
    }

    if (deneme < DENEME) await bekle(400 * 2 ** (deneme - 1));
  }

  return { ok: false, hata: sonHata };
}

/**
 * Müşteriye mesaj yazar. Uzun metin birden çok mesaja bölünüyor; hızlı cevap
 * düğmeleri yalnızca son parçaya iliştiriliyor ki düğmeler metnin altında
 * kalsın.
 */
export async function mesajGonder(
  token: string,
  aliciId: string,
  metin: string,
  hizliCevaplar: HizliCevap[] = []
): Promise<GonderimSonucu> {
  const parcalar = parcala(metin);

  for (const [sira, parca] of parcalar.entries()) {
    const sonuncu = sira === parcalar.length - 1;
    const mesaj: IstekGovdesi = { text: parca };

    if (sonuncu && hizliCevaplar.length > 0) {
      mesaj.quick_replies = hizliCevaplar.slice(0, 13).map((cevap) => ({
        content_type: "text",
        // Instagram başlığı 20 karakterle sınırlıyor; uzun başlık isteği reddeder.
        title: cevap.baslik.slice(0, 20),
        payload: cevap.yuk,
      }));
    }

    const sonuc = await istek("/me/messages", token, {
      recipient: { id: aliciId },
      message: mesaj,
    });

    if (!sonuc.ok) return sonuc;
  }

  return { ok: true };
}

/**
 * "Yazıyor" göstergesi. Müsaitlik sorgusu birkaç yüz milisaniye sürüyor ve o
 * sessizlik sohbette donmuş gibi duruyor. Başarısız olması önemli değil, o
 * yüzden sonucu yutuluyor.
 */
export async function yaziyorGoster(token: string, aliciId: string): Promise<void> {
  await istek("/me/messages", token, {
    recipient: { id: aliciId },
    sender_action: "typing_on",
  }).catch(() => undefined);
}

/** Müşterinin görünen adı; talebe "Instagram kullanıcısı" yazmamak için. */
export async function profilOku(
  token: string,
  igsid: string
): Promise<{ name?: string; username?: string } | null> {
  try {
    const cevap = await fetch(
      `${TABAN}/${igsid}?fields=name,username`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
        cache: "no-store",
      }
    );

    if (!cevap.ok) return null;
    return (await cevap.json()) as { name?: string; username?: string };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hesap bağlama
// ---------------------------------------------------------------------------

export type TokenSonucu =
  | { ok: true; token: string; igUserId: string; expiresAt: string | null }
  | { ok: false; hata: string };

/**
 * OAuth kodunu kalıcı belirtece çevirir.
 *
 * İki adım: Instagram önce yalnızca bir saat yaşayan kısa ömürlü bir belirteç
 * veriyor, onu 60 günlük uzun ömürlüsüyle değiştirmek ayrı bir istek. İlkiyle
 * yetinseydik bağlantı bir saat sonra sessizce ölürdü.
 */
export async function tokenAl(
  kod: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<TokenSonucu> {
  try {
    const govde = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code: kod,
    });

    const kisa = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: govde,
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: "no-store",
    });

    if (!kisa.ok) {
      return { ok: false, hata: `Kod belirtece çevrilemedi (${kisa.status}).` };
    }

    const kisaVeri = (await kisa.json()) as {
      access_token?: string;
      user_id?: number | string;
    };

    if (!kisaVeri.access_token || kisaVeri.user_id === undefined) {
      return { ok: false, hata: "Instagram beklenen belirteci döndürmedi." };
    }

    const uzunUrl = new URL("https://graph.instagram.com/access_token");
    uzunUrl.searchParams.set("grant_type", "ig_exchange_token");
    uzunUrl.searchParams.set("client_secret", clientSecret);
    uzunUrl.searchParams.set("access_token", kisaVeri.access_token);

    const uzun = await fetch(uzunUrl, {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: "no-store",
    });

    if (!uzun.ok) {
      return { ok: false, hata: `Kalıcı belirteç alınamadı (${uzun.status}).` };
    }

    const uzunVeri = (await uzun.json()) as {
      access_token?: string;
      expires_in?: number;
    };

    if (!uzunVeri.access_token) {
      return { ok: false, hata: "Kalıcı belirteç boş döndü." };
    }

    return {
      ok: true,
      token: uzunVeri.access_token,
      igUserId: String(kisaVeri.user_id),
      expiresAt: uzunVeri.expires_in
        ? new Date(Date.now() + uzunVeri.expires_in * 1000).toISOString()
        : null,
    };
  } catch (err) {
    return { ok: false, hata: (err as Error).message };
  }
}

/**
 * Uzun ömürlü belirteci tazeler. Günlük cron son on güne giren bağlantıları
 * buradan geçiriyor: 60 günde bir elle yenilenen bir entegrasyon, 61. günde
 * sessizce duran bir entegrasyondur.
 */
export async function tokenTazele(
  token: string
): Promise<{ ok: true; token: string; expiresAt: string | null } | { ok: false; hata: string }> {
  try {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", token);

    const cevap = await fetch(url, {
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: "no-store",
    });

    if (!cevap.ok) {
      return { ok: false, hata: `Belirteç tazelenemedi (${cevap.status}).` };
    }

    const veri = (await cevap.json()) as { access_token?: string; expires_in?: number };
    if (!veri.access_token) return { ok: false, hata: "Tazelenen belirteç boş döndü." };

    return {
      ok: true,
      token: veri.access_token,
      expiresAt: veri.expires_in
        ? new Date(Date.now() + veri.expires_in * 1000).toISOString()
        : null,
    };
  } catch (err) {
    return { ok: false, hata: (err as Error).message };
  }
}

/**
 * Bağlanan hesabın kimlikleri ve kullanıcı adı.
 *
 * Instagram aynı hesabı iki numarayla anıyor ve ikisi de lazım: `id`
 * uygulamaya özel kimlik (OAuth bunu döndürüyor), `user_id` ise hesabın asıl
 * işletme kimliği ve **webhook gövdesinde gelen numara bu**. Yalnızca ilkini
 * saklamak, gelen mesajın hiçbir satıcıya çözülememesi demekti (bkz. 0028).
 */
export type HesapBilgisi = {
  username: string | null;
  /** `/me?fields=id` — uygulamaya özel kimlik. */
  scopedId: string | null;
  /** `/me?fields=user_id` — IGID; webhook `entry[].id` bununla geliyor. */
  businessId: string | null;
};

export async function hesapBilgisiOku(token: string): Promise<HesapBilgisi> {
  try {
    const cevap = await fetch(`${TABAN}/me?fields=id,user_id,username`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: "no-store",
    });

    if (!cevap.ok) return { username: null, scopedId: null, businessId: null };

    const veri = (await cevap.json()) as {
      id?: string | number;
      user_id?: string | number;
      username?: string;
    };

    return {
      username: veri.username ?? null,
      scopedId: veri.id !== undefined ? String(veri.id) : null,
      businessId: veri.user_id !== undefined ? String(veri.user_id) : null,
    };
  } catch {
    return { username: null, scopedId: null, businessId: null };
  }
}
