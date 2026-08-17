"use server";

import { getCurrentUser } from "@/lib/auth";
import { getProfile } from "@/lib/profile";
import { getSubscription } from "@/lib/subscription";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  cancelSubscription,
  initializeSubscriptionCheckout,
  iyzicoConfig,
  type IyzicoCustomer,
} from "@/lib/iyzico";
import { isProvince } from "@/lib/turkiye";

export type CheckoutState = {
  error: string | null;
  /** Sayfaya gömülecek iyzico parçacığı. Doluysa form çizilmeye hazır. */
  content?: string;
};

const MAX_NAME = 100;
const MAX_ADDRESS = 300;

/**
 * TC kimlik numarasının biçimi. iyzico abonelik için zorunlu tutuyor.
 *
 * Yalnızca uzunluk ve ilk hanenin sıfır olmaması kontrol ediliyor —
 * doğrulamanın tamamını iyzico yapıyor, buradaki kontrol kullanıcıya hatayı
 * ödeme formuna gitmeden söylemek için.
 */
const IDENTITY_PATTERN = /^[1-9][0-9]{10}$/;

/**
 * Telefonu iyzico'nun beklediği E.164 biçimine çeviriyor: +905551112233.
 *
 * Kullanıcı numarayı beş ayrı biçimde yazıyor — `5551112233`, `0555 111 22 33`,
 * `+90 555 111 22 33`, `90...`, `0090...`. Bu yüzden son on hane numaranın
 * kendisi kabul edilip *öndeki* kısmın tanınan bir ülke/şehirlerarası öneki
 * olması şart koşuluyor. Öneki serbest bıraksaydık `12345551112233` gibi
 * bozuk bir girdi de geçerli sayılırdı.
 */
function normalizeGsm(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  const local = digits.slice(-10);
  const prefix = digits.slice(0, -10);

  if (!/^(0|90|090|0090)?$/.test(prefix)) return null;
  // Cep hattı 5 ile başlıyor; sabit hat tekrarlayan ödemede kullanılamıyor.
  if (local.length !== 10 || !local.startsWith("5")) return null;

  return `+90${local}`;
}

function readCustomer(
  formData: FormData,
  email: string
): { error: string } | { values: IyzicoCustomer } {
  const name = String(formData.get("name") ?? "").trim();
  const surname = String(formData.get("surname") ?? "").trim();
  const identityNumber = String(formData.get("identity_number") ?? "").replace(/\s/g, "");
  const city = String(formData.get("city") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const gsm = normalizeGsm(String(formData.get("gsm") ?? ""));

  if (!name || name.length > MAX_NAME) return { error: "Ad gereklidir." };
  if (!surname || surname.length > MAX_NAME) return { error: "Soyad gereklidir." };
  if (!IDENTITY_PATTERN.test(identityNumber)) {
    return { error: "TC kimlik numarası 11 haneli olmalıdır." };
  }
  if (!gsm) {
    return { error: "Telefon numarasını 5xx xxx xx xx biçiminde girin." };
  }
  if (!isProvince(city)) return { error: "Geçerli bir il seçin." };
  if (!address || address.length > MAX_ADDRESS) {
    return { error: `Fatura adresi gereklidir (en fazla ${MAX_ADDRESS} karakter).` };
  }

  return {
    values: {
      name,
      surname,
      email,
      gsmNumber: gsm,
      identityNumber,
      billingAddress: {
        contactName: `${name} ${surname}`,
        city,
        country: "Turkey",
        address,
      },
    },
  };
}

/**
 * Ödeme formunu başlatır.
 *
 * Kart bilgisi buraya hiç gelmiyor: bu çağrı yalnızca iyzico'dan bir form
 * parçacığı alıyor, kartı kullanıcı iyzico'nun kendi formuna giriyor.
 *
 * Dönen token satıra yazılıyor (`pending_checkout_token`) — geri dönüşte hangi
 * hesabın ödediğini bulmanın güvenli yolu bu.
 */
export async function startCheckout(
  _prev: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const [user, profile] = await Promise.all([getCurrentUser(), getProfile()]);

  if (!user || !profile) return { error: "Bunu yapmak için giriş yapmalısınız." };
  if (profile.status !== "approved") {
    return { error: "Hesabınız henüz onaylanmadı." };
  }
  if (!user.email) {
    return { error: "Hesabınızda e-posta adresi bulunamadı." };
  }

  const config = iyzicoConfig();
  if (!config) {
    return {
      error:
        "Ödeme altyapısı henüz yapılandırılmadı. Lütfen bizimle iletişime geçin.",
    };
  }

  // Zaten aboneliği varsa ikinci kez tahsilat yapılmasın. Süresi *dolmuş* bir
  // abonelik burada engel değil — yenilemek için tam da buraya geliyor.
  const existing = await getSubscription();
  if (existing?.active && existing.status !== "trialing") {
    return { error: "Aboneliğiniz hâlihazırda sürüyor." };
  }

  const customer = readCustomer(formData, user.email);
  if ("error" in customer) return { error: customer.error };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return { error: "Site adresi yapılandırılmadı, ödeme başlatılamıyor." };
  }

  const result = await initializeSubscriptionCheckout(config, {
    callbackUrl: `${siteUrl.replace(/\/+$/, "")}/abonelik/tamamlandi`,
    customer: customer.values,
    conversationId: user.id,
  });

  if (!result.ok) return { error: result.error };

  // Service role: satıcının kendi abonelik satırına yazma politikası yok
  // (bilinçli — bkz. 0025). Token'ı yazan taraf sunucu.
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      pending_checkout_token: result.data.token,
      iyzico_plan_ref: config.pricingPlanRef,
    })
    .eq("owner_id", user.id);

  if (error) {
    // Token saklanamadıysa forma hiç girmemek daha iyi: kullanıcı öderdi ama
    // geri dönüşte hangi hesap olduğunu bulamazdık.
    return { error: "Ödeme başlatılamadı. Lütfen tekrar deneyin." };
  }

  return { error: null, content: result.data.content };
}

/**
 * Aboneliği iptal eder — yenileme durur, erişim ödenmiş dönemin sonuna kadar
 * sürer. `current_period_end` bilinçli olarak geriye çekilmiyor.
 */
export async function cancel(): Promise<{ error: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Bunu yapmak için giriş yapmalısınız." };

  const config = iyzicoConfig();
  if (!config) return { error: "Ödeme altyapısı yapılandırılmadı." };

  const subscription = await getSubscription();
  if (!subscription?.iyzicoSubscriptionRef) {
    return { error: "İptal edilecek bir abonelik bulunamadı." };
  }

  const result = await cancelSubscription(config, subscription.iyzicoSubscriptionRef);
  if (!result.ok) return { error: result.error };

  const admin = createAdminClient();
  await admin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("owner_id", user.id);

  return { error: null };
}
