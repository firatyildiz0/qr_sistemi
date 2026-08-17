import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  iyzicoConfig,
  retrieveSubscriptionCheckout,
  type IyzicoSubscriptionStatus,
} from "@/lib/iyzico";

/**
 * iyzico ödeme formunun dönüş adresi.
 *
 * Kullanıcı kartını iyzico'nun formunda girdikten sonra tarayıcısı buraya
 * **POST** ile geliyor (form gönderimi, yönlendirme değil) ve gövdede bir
 * `token` taşıyor.
 *
 * Buradaki gövdeye güvenilmiyor. İki ayrı doğrulama var:
 *
 * 1. Ödemenin gerçekten olup olmadığını iyzico'ya doğrudan sorup öğreniyoruz
 *    (`retrieveSubscriptionCheckout`). Gövdedeki hiçbir alan aboneliği açmıyor.
 * 2. Hangi hesabın ödediğini token'ın *kendisi* söylüyor: form başlatılırken
 *    token o hesabın satırına yazılmıştı (`pending_checkout_token`). Yani
 *    başkasının token'ıyla gelen istek yalnızca o token'ın sahibinin satırını
 *    bulur — kendi hesabını açtırmaya yaramaz.
 *
 * Bu yüzden uç herkese açık olabiliyor: elle atılan bir istek geçerli bir
 * token bilmeden hiçbir şey yapamıyor.
 */

/** Ödeme başarısızsa kullanıcı ekrana bir sebeple dönsün. */
function back(request: NextRequest, outcome: "tamam" | "hata" | "beklemede") {
  const url = new URL("/abonelik", request.url);
  url.searchParams.set("durum", outcome);
  // 303: POST'tan sonra tarayıcı GET ile gitsin, yoksa yenilemede formu
  // yeniden göndermeye çalışırdı.
  return NextResponse.redirect(url, 303);
}

/**
 * iyzico'nun abonelik durumları bizim durumlarımıza eşleniyor.
 *
 * `PENDING` bilinçli olarak erişim vermiyor: iyzico'da askıya alınmış ya da
 * henüz başlamamış abonelik demek, yani parası alınmamış.
 */
function mapStatus(status: IyzicoSubscriptionStatus): {
  status: string;
  grantsAccess: boolean;
} {
  switch (status) {
    case "ACTIVE":
    case "UPGRADED":
      return { status: "active", grantsAccess: true };
    case "UNPAID":
      return { status: "past_due", grantsAccess: false };
    case "CANCELED":
    case "CANCELLED":
      return { status: "canceled", grantsAccess: false };
    case "EXPIRED":
      return { status: "expired", grantsAccess: false };
    case "PENDING":
      return { status: "past_due", grantsAccess: false };
  }
}

/** Dönem bitişi: iyzico söylediyse onu, söylemediyse bir ay sonrası. */
function periodEnd(endDate: number | null): string {
  if (endDate) return new Date(endDate).toISOString();

  const next = new Date();
  next.setMonth(next.getMonth() + 1);
  return next.toISOString();
}

async function readToken(request: NextRequest): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  // iyzico form gönderimi yapıyor; JSON da kabul ediliyor ki uç elle test
  // edilebilsin.
  try {
    if (contentType.includes("json")) {
      const body = (await request.json()) as { token?: unknown };
      return typeof body.token === "string" ? body.token : null;
    }

    const form = await request.formData();
    const token = form.get("token");
    return typeof token === "string" ? token : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const config = iyzicoConfig();
  if (!config) return back(request, "hata");

  const token = await readToken(request);
  if (!token) return back(request, "hata");

  const admin = createAdminClient();

  // Token'ın sahibi. Bulunamıyorsa istek ya uydurma ya da çok geç geldi
  // (aynı token ikinci kez kullanılamıyor, çünkü aşağıda temizleniyor).
  const { data: row } = await admin
    .from("subscriptions")
    .select("owner_id")
    .eq("pending_checkout_token", token)
    .maybeSingle();

  if (!row) return back(request, "hata");

  const result = await retrieveSubscriptionCheckout(config, token);
  if (!result.ok) return back(request, "hata");

  const mapped = mapStatus(result.data.status);

  await admin
    .from("subscriptions")
    .update({
      status: mapped.status,
      // Erişim yoksa dönem bitişi de yazılmıyor: yazılsaydı ödenmemiş bir
      // abonelik bir ay boyunca açık kalırdı.
      current_period_end: mapped.grantsAccess ? periodEnd(result.data.endDate) : null,
      iyzico_subscription_ref: result.data.subscriptionRef,
      iyzico_customer_ref: result.data.customerRef,
      price_try: mapped.grantsAccess ? Number(process.env.IYZICO_PRICE_TRY ?? 999) : null,
      last_event_at: new Date().toISOString(),
      last_failure_reason: mapped.grantsAccess ? null : `iyzico: ${result.data.status}`,
      // Token tek kullanımlık: temizlenmezse aynı token'la tekrar tekrar
      // istek atılabilirdi.
      pending_checkout_token: null,
    })
    .eq("owner_id", row.owner_id);

  // Kapı `getSubscription()` üzerinden okunuyor ve o istek başına önbellekli;
  // panelin sayfaları da abonelik durumuna göre çiziliyor.
  revalidatePath("/abonelik");
  revalidatePath("/admin", "layout");

  if (!mapped.grantsAccess) return back(request, "beklemede");

  // Ödeme tamam — kullanıcıyı doğrudan panele al, ödeme ekranına geri
  // döndürüp "artık girebilirsiniz" dedirtmenin anlamı yok.
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}

/**
 * Kullanıcı ödeme formunu yarıda bırakıp geri tuşuna basarsa tarayıcı buraya
 * GET ile gelebiliyor. Sessizce ödeme ekranına dönsün, 405 görmesin.
 */
export async function GET(request: NextRequest) {
  return back(request, "hata");
}
