import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * iyzico abonelik API'si — sunucu tarafı istemci.
 *
 * Neden hazır paket değil: iyzico'nun resmî `iyzipay` paketi eski SHA1
 * kimlik doğrulamasını ve geri çağırma (callback) tabanlı bir API kullanıyor,
 * ayrıca abonelik uçlarının bir kısmını hiç kapsamıyor. Gereken üç şey (imza,
 * `fetch`, JSON) zaten burada, dolayısıyla bağımlılık eklemenin karşılığı yok.
 *
 * Neden kart verisi hiç görülmüyor: ödeme, iyzico'nun kendi formunda (checkout
 * form) alınıyor. Kart numarası hiçbir zaman bizim sunucumuza gelmiyor — PCI
 * kapsamına girmemenin tek yolu bu. Abonelik yalnızca kredi kartıyla
 * çalışıyor (iyzico kısıtı), banka kartı kabul edilmiyor.
 */

// ---------------------------------------------------------------------------
// Yapılandırma
// ---------------------------------------------------------------------------

const PRODUCTION_BASE = "https://api.iyzipay.com";
const SANDBOX_BASE = "https://sandbox-api.iyzipay.com";

export type IyzicoConfig = {
  apiKey: string;
  secretKey: string;
  merchantId: string;
  baseUrl: string;
  /** Aylık planın iyzico'daki referans kodu (bkz. scripts/iyzico-plan.mjs). */
  pricingPlanRef: string;
};

/**
 * Ortam değişkenleri. Eksikse `null` — çağıran taraf bunu "ödeme henüz
 * kurulmadı" diye yorumlayıp kurulum notu gösteriyor, çökmüyor. Yayın
 * panelindeki ve Sentry'deki desenin aynısı.
 */
export function iyzicoConfig(): IyzicoConfig | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secretKey = process.env.IYZICO_SECRET_KEY;
  const merchantId = process.env.IYZICO_MERCHANT_ID;
  const pricingPlanRef = process.env.IYZICO_PRICING_PLAN_REF;

  if (!apiKey || !secretKey || !merchantId || !pricingPlanRef) return null;

  return {
    apiKey,
    secretKey,
    merchantId,
    pricingPlanRef,
    // Sandbox varsayılan: canlı tahsilat açık bir karar olsun, unutulan bir
    // ortam değişkeni yüzünden gerçek kart çekilmesin.
    baseUrl: process.env.IYZICO_ENV === "production" ? PRODUCTION_BASE : SANDBOX_BASE,
  };
}

export function isSandbox(config: IyzicoConfig): boolean {
  return config.baseUrl === SANDBOX_BASE;
}

// ---------------------------------------------------------------------------
// Kimlik doğrulama (IYZWSv2 / HMAC-SHA256)
// ---------------------------------------------------------------------------

/**
 * İmza: `HMACSHA256(randomKey + uriPath + body, secretKey)`, onaltılık olarak.
 *
 * Üç ayrıntı yanlış yapılırsa uç 401 dönüyor ve sebebini söylemiyor:
 *
 * 1. `uriPath` sorgu dizesi *dahil* gövdeden önce geliyor ve istekte gidenle
 *    birebir aynı olmak zorunda — bir eğik çizgi farkı imzayı bozuyor.
 * 2. `body`, gönderilen JSON'un *tam olarak* kendisi. Bu yüzden aşağıda bir
 *    kez `stringify` edilip hem imzaya hem gövdeye aynı dize veriliyor;
 *    iki kez üretilse alan sırası değişebilir ve imza tutmazdı.
 * 3. `randomKey` hem imzanın içine hem `x-iyzi-rnd` başlığına giriyor; ikisi
 *    aynı değer olmalı.
 */
function authorization(
  config: IyzicoConfig,
  uriPath: string,
  body: string
): { authorization: string; randomKey: string } {
  const randomKey = `${Date.now()}${randomBytes(4).toString("hex")}`;

  const signature = createHmac("sha256", config.secretKey)
    .update(`${randomKey}${uriPath}${body}`)
    .digest("hex");

  const payload = `apiKey:${config.apiKey}&randomKey:${randomKey}&signature:${signature}`;

  return {
    authorization: `IYZWSv2 ${Buffer.from(payload).toString("base64")}`,
    randomKey,
  };
}

export type IyzicoResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; errorCode?: string };

type IyzicoEnvelope = {
  status?: string;
  errorMessage?: string;
  errorCode?: string;
  data?: unknown;
};

/** Uç yavaşsa ödeme ekranı sonsuza kadar beklemesin. */
const TIMEOUT_MS = 15_000;

/**
 * Tek çıkış noktası: imzayı kuruyor, isteği atıyor, zarfı açıyor.
 *
 * iyzico HTTP 200 ile de hata dönebiliyor (`status: "failure"`), o yüzden
 * yanıt kodu tek başına yeterli değil — gövdedeki `status` da kontrol ediliyor.
 */
async function request<T>(
  config: IyzicoConfig,
  method: "GET" | "POST",
  uriPath: string,
  payload?: unknown
): Promise<IyzicoResult<T>> {
  // İmzalanan dize ile gönderilen gövde aynı olmalı: tek bir `stringify`.
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const { authorization: auth, randomKey } = authorization(config, uriPath, body);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${uriPath}`, {
      method,
      headers: {
        Authorization: auth,
        "x-iyzi-rnd": randomKey,
        "Content-Type": "application/json",
      },
      body: method === "POST" ? body : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, error: "Ödeme sağlayıcısına ulaşılamadı. Lütfen tekrar deneyin." };
  }

  let envelope: IyzicoEnvelope;
  try {
    envelope = (await response.json()) as IyzicoEnvelope;
  } catch {
    return {
      ok: false,
      error: `Ödeme sağlayıcısı beklenmeyen bir yanıt verdi (${response.status}).`,
    };
  }

  if (envelope.status !== "success") {
    return {
      ok: false,
      // iyzico'nun mesajları Türkçe ve kullanıcıya gösterilebilir düzeyde
      // ("Kart limiti yetersiz"). Yoksa genel bir cümleye düşülüyor.
      error: envelope.errorMessage ?? "Ödeme işlemi tamamlanamadı.",
      errorCode: envelope.errorCode,
    };
  }

  // Abonelik uçları sonucu `data` içinde veriyor; checkout form başlatma ise
  // alanları zarfın kökünde döndürüyor. İkisi de aynı yerden okunabilsin.
  return { ok: true, data: (envelope.data ?? envelope) as T };
}

// ---------------------------------------------------------------------------
// Abonelik başlatma
// ---------------------------------------------------------------------------

export type IyzicoCustomer = {
  name: string;
  surname: string;
  email: string;
  /** E.164 biçiminde: +905551112233. */
  gsmNumber: string;
  /** TC kimlik numarası — iyzico abonelik için zorunlu tutuyor. */
  identityNumber: string;
  billingAddress: {
    contactName: string;
    city: string;
    country: string;
    address: string;
    zipCode?: string;
  };
};

export type CheckoutForm = {
  token: string;
  /** Sayfaya gömülecek script parçacığı. Formu iyzico'nun kendisi çiziyor. */
  content: string;
  /** Token'ın geçerlilik süresi, saniye. */
  expiresIn: number;
};

/**
 * Ödeme formunu başlatır ve gömülecek parçacığı döndürür.
 *
 * `subscriptionInitialStatus: "ACTIVE"`: kart doğrulanır doğrulanmaz ilk
 * tahsilat yapılıp abonelik başlıyor. `PENDING` olsaydı ayrıca aktifleştirme
 * çağrısı gerekirdi ve kullanıcı ödediği halde kilitli kalabilirdi.
 *
 * `conversationId` bizim kullanıcı kimliğimiz: geri dönen sonucu ve webhook'u
 * doğru hesaba bağlamanın yolu bu.
 */
export async function initializeSubscriptionCheckout(
  config: IyzicoConfig,
  options: { callbackUrl: string; customer: IyzicoCustomer; conversationId: string }
): Promise<IyzicoResult<CheckoutForm>> {
  const result = await request<{
    token?: string;
    checkoutFormContent?: string;
    htmlContent?: string;
    tokenExpireTime?: number;
  }>(config, "POST", "/v2/subscription/checkoutform/initialize", {
    locale: "tr",
    conversationId: options.conversationId,
    callbackUrl: options.callbackUrl,
    pricingPlanReferenceCode: config.pricingPlanRef,
    subscriptionInitialStatus: "ACTIVE",
    customer: options.customer,
  });

  if (!result.ok) return result;

  // Alan adı dokümantasyonun iki dilinde farklı yazılmış
  // (`checkoutFormContent` / `htmlContent`); ikisi de kabul ediliyor ki uç
  // hangisini döndürürse döndürsün form çizilsin.
  const content = result.data.checkoutFormContent ?? result.data.htmlContent;

  if (!result.data.token || !content) {
    return { ok: false, error: "Ödeme formu alınamadı. Lütfen tekrar deneyin." };
  }

  return {
    ok: true,
    data: {
      token: result.data.token,
      content,
      expiresIn: result.data.tokenExpireTime ?? 1800,
    },
  };
}

/** iyzico'nun abonelik durumları. Bizim durumlarımıza aşağıda eşleniyor. */
export type IyzicoSubscriptionStatus =
  | "ACTIVE"
  | "PENDING"
  | "UNPAID"
  | "UPGRADED"
  | "CANCELED"
  | "CANCELLED"
  | "EXPIRED";

export type SubscriptionResult = {
  subscriptionRef: string;
  customerRef: string | null;
  status: IyzicoSubscriptionStatus;
  /** Dönem bitişi, epoch ms. iyzico vermezse çağıran taraf bir ay ekliyor. */
  endDate: number | null;
};

/**
 * Ödeme formunun sonucunu token ile sorgular.
 *
 * Bu çağrı **atlanamaz**. iyzico ödeme sonrası tarayıcıyı `callbackUrl`'imize
 * yönlendiriyor, ama o isteğin gövdesine güvenilemez: kullanıcı (ya da başka
 * biri) aynı adrese elle "ödeme başarılı" gövdesiyle istek atabilir.
 * Aboneliği açan tek şey iyzico'ya doğrudan sorup aldığımız bu yanıt.
 */
export async function retrieveSubscriptionCheckout(
  config: IyzicoConfig,
  token: string
): Promise<IyzicoResult<SubscriptionResult>> {
  const result = await request<{
    referenceCode?: string;
    subscriptionReferenceCode?: string;
    customerReferenceCode?: string;
    subscriptionStatus?: string;
    endDate?: number | string;
  }>(config, "GET", `/v2/subscription/checkoutform/${encodeURIComponent(token)}`);

  if (!result.ok) return result;

  const subscriptionRef =
    result.data.subscriptionReferenceCode ?? result.data.referenceCode;

  if (!subscriptionRef) {
    return { ok: false, error: "Abonelik sonucu okunamadı." };
  }

  const endDate = result.data.endDate;

  return {
    ok: true,
    data: {
      subscriptionRef,
      customerRef: result.data.customerReferenceCode ?? null,
      status: (result.data.subscriptionStatus ?? "PENDING").toUpperCase() as IyzicoSubscriptionStatus,
      endDate: endDate === undefined ? null : Number(new Date(endDate)) || Number(endDate) || null,
    },
  };
}

/** Aboneliği iptal eder. Kullanıcı dönem sonuna kadar erişimini koruyor. */
export async function cancelSubscription(
  config: IyzicoConfig,
  subscriptionRef: string
): Promise<IyzicoResult<unknown>> {
  return request(
    config,
    "POST",
    `/v2/subscription/subscriptions/${encodeURIComponent(subscriptionRef)}/cancel`
  );
}

// ---------------------------------------------------------------------------
// Webhook doğrulama
// ---------------------------------------------------------------------------

export type WebhookPayload = {
  iyziEventType: string;
  iyziReferenceCode?: string;
  iyziEventTime?: number;
  subscriptionReferenceCode?: string;
  orderReferenceCode?: string;
  customerReferenceCode?: string;
};

/**
 * Webhook'un gerçekten iyzico'dan geldiğini doğrular.
 *
 * İmza: `HMACSHA256(merchantId + secretKey + eventType +
 * subscriptionReferenceCode + orderReferenceCode + customerReferenceCode)`,
 * onaltılık — sıra tam olarak bu. Başlık `X-IYZ-SIGNATURE-V3`; iyzico'nun
 * eski `V1`/`V2` başlıkları artık desteklenmiyor, o yüzden onlara hiç
 * bakılmıyor (kabul etmek imzasız isteğe kapı açardı).
 *
 * Karşılaştırma `timingSafeEqual` ile: `===` ile karşılaştırmak imzayı
 * karakter karakter tahmin etmeye izin veren bir zamanlama kanalı bırakır.
 */
export function verifyWebhook(
  config: IyzicoConfig,
  payload: WebhookPayload,
  signature: string | null
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", config.secretKey)
    .update(
      config.merchantId +
        config.secretKey +
        payload.iyziEventType +
        (payload.subscriptionReferenceCode ?? "") +
        (payload.orderReferenceCode ?? "") +
        (payload.customerReferenceCode ?? "")
    )
    .digest("hex");

  const received = Buffer.from(signature.trim().toLowerCase(), "utf8");
  const computed = Buffer.from(expected, "utf8");

  // Uzunluklar farklıysa `timingSafeEqual` fırlatıyor; önce uzunluk kontrolü.
  return received.length === computed.length && timingSafeEqual(received, computed);
}

// CSP'ye eklenecek iyzico alan adları `lib/iyzico-origins.ts`'te — proxy de
// aynı listeyi okuyor ve bu dosyayı (node:crypto yüzünden) içe aktaramıyor.
export { IYZICO_CSP_ORIGINS } from "@/lib/iyzico-origins";
