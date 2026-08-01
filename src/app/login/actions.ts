"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNextPath } from "@/lib/redirects";
import { isValidUsername, normalizeUsername, USERNAME_RULE } from "@/lib/username";
import {
  checkLoginRateLimit,
  checkSignupRateLimit,
  recordSecurityEvent,
} from "@/lib/security";
import { passwordError } from "@/lib/password";
import { isTelegramConfigured } from "@/lib/telegram";
import { startLoginChallenge, verifyLoginChallenge } from "@/lib/two-factor";

// `awaitingApproval`, arayüzün "onay bekleniyor" penceresini açması için: aynı
// durum hem kayıttan hemen sonra hem de onaysız hesapla giriş denendiğinde
// doğuyor, ikisinde de aynı pencere çıkıyor (bkz. PendingApprovalDialog).
//
// `challengeId` doluysa şifre doğruydu ama oturum henüz açılmadı: form kod
// adımına geçiyor ve o değeri `verifyLoginCode`'a geri veriyor. İçinde kullanıcı
// bilgisi yok, yalnızca bilet numarası (bkz. lib/two-factor.ts).
export type LoginState = {
  error: string | null;
  awaitingApproval: boolean;
  challengeId: string | null;
};
export type SignupState = {
  error: string | null;
  notice: string | null;
  awaitingApproval: boolean;
};


/**
 * Kullanıcı adı → hesabın e-postası.
 *
 * Supabase Auth kullanıcı adıyla oturum açamaz, o yüzden asıl `signInWithPassword`
 * çağrısından önce eşlemeyi burada yapıyoruz. `profiles` tablosu anon anahtara
 * tamamen kapalı olduğundan okuma service role ile yapılır; e-posta yalnızca
 * bu sunucu fonksiyonunun içinde kalır, istemciye hiç dönmez.
 */
async function emailForUsername(username: string): Promise<string | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return null;

  const { data } = await admin.auth.admin.getUserById(profile.id);
  return data?.user?.email ?? null;
}

export async function signIn(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const identifier = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!identifier || !password) {
    return {
      error: "Kullanıcı adı ve şifre gereklidir.",
      awaitingApproval: false,
      challengeId: null,
    };
  }

  // Şifre denenmeden önce: son 15 dakikadaki başarısız denemeler eşiği aştıysa
  // istek buradan geri döner. Eşik hem kullanıcı adına hem IP'ye bakıyor, ikisi
  // iki ayrı saldırıyı yakalıyor (bkz. lib/security.ts).
  const limit = await checkLoginRateLimit(identifier);
  if (!limit.allowed) {
    return {
      error: limit.message,
      awaitingApproval: false,
      challengeId: null,
    };
  }

  // Kullanıcı adı da e-posta da kabul edilir: kullanıcı adı zorunlu olalı
  // beri kayıtlı olanların türetilmiş bir kullanıcı adı var ve onu bilmiyorlar
  // — e-postayla giriş o hesapları kilit dışında tutar. "@" ayırt etmeye yeter,
  // çünkü kullanıcı adında bu karakter olamıyor.
  //
  // Kullanıcı adı yok mu, şifre mi yanlış — ikisi de aynı mesajı döner, aksi
  // halde form hangi kullanıcı adlarının kayıtlı olduğunu ele verirdi.
  const email = identifier.includes("@") ? identifier : await emailForUsername(identifier);
  if (!email) {
    // Kullanıcı adı yok — ama bu da bir deneme. Sayılmazsa saldırgan var olmayan
    // adlarla sınırsız deneyip hangilerinin kayıtlı olduğunu tarayabilirdi.
    await recordSecurityEvent({
      kind: "login_failed",
      severity: "info",
      identifier,
      detail: { reason: "unknown_identifier" },
    });
    return {
      error: "Kullanıcı adı veya şifre hatalı.",
      awaitingApproval: false,
      challengeId: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    await recordSecurityEvent({
      kind: "login_failed",
      severity: "info",
      identifier,
      detail: { reason: "bad_password" },
    });
    return {
      error: "Kullanıcı adı veya şifre hatalı.",
      awaitingApproval: false,
      challengeId: null,
    };
  }

  // Şifre doğru olsa da hesabın onaylanmış olması gerekiyor. Oturum bu noktada
  // açılmış durumda; onaysızsa hemen kapatılır ki panele hiç uğramasın.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.status !== "approved") {
    await supabase.auth.signOut();
    // Şifre doğruydu ama hesap onaylı değil. Reddedilmiş bir hesabın ısrarla
    // girmeye çalışması bilinmesi gereken bir şey.
    await recordSecurityEvent({
      kind: "unauthorized",
      severity: profile?.status === "rejected" ? "warning" : "info",
      identifier,
      detail: { reason: "account_not_approved", status: profile?.status ?? "missing" },
    });
    // Reddedilmiş hesabın bekleyecek bir şeyi yok — ona pencere değil, satır
    // altında düz bir mesaj gösteriliyor.
    if (profile?.status === "rejected") {
      return {
        error: "Başvurunuz onaylanmadı. Ayrıntı için yöneticiyle görüşün.",
        awaitingApproval: false,
        challengeId: null,
      };
    }

    return {
      error: "Hesabınız henüz onaylanmadı. Onaylandığında giriş yapabilirsiniz.",
      awaitingApproval: true,
      challengeId: null,
    };
  }

  // Yönetim panelinin anahtarı tek bir şifreye bağlı kalmasın: superuser'ın
  // şifresi doğru olsa bile oturum burada açılmıyor. Az önce açılan oturum
  // kapatılıyor, telefona bir kod gidiyor ve giriş ikinci adıma devrediliyor
  // (bkz. verifyLoginCode). Şifreyi ele geçiren birinin telefona da erişmesi
  // gerekiyor artık.
  //
  // `scope: "local"`: yalnızca bu tarayıcının çerezleri siliniyor. Genel çıkış
  // superuser'ın açık olan diğer oturumlarını da düşürürdü — her giriş denemesi
  // kullanıcıyı öbür cihazlarından atmasın.
  //
  // Telegram hiç kurulmamışsa ikinci adım devreye girmiyor: ortam değişkenleri
  // olmadan yayına alınan bir sürüm kullanıcıyı kendi panelinin dışında
  // bırakmasın. Kurulu ama gönderim başarısızsa kapı kapanıyor — o zaman
  // ortada gerçekten bir arıza var (bkz. lib/telegram.ts).
  if (profile.role === "superuser" && isTelegramConfigured()) {
    await supabase.auth.signOut({ scope: "local" });

    const challenge = await startLoginChallenge(data.user.id);

    if (!challenge.ok) {
      return { error: challenge.message, awaitingApproval: false, challengeId: null };
    }

    await recordSecurityEvent({
      kind: "two_factor_sent",
      severity: "info",
      identifier,
      detail: { role: profile.role },
    });

    return { error: null, awaitingApproval: false, challengeId: challenge.challengeId };
  }

  // Başarılı giriş kaydedilmiyor: güvenlik ekranı olağandışı olanı göstermek
  // için var, kimin ne zaman girdiğini tutmak için değil. Sıradan bir günün
  // bütün girişlerini saklamak listeyi gürültüye boğuyor ve gereksiz yere
  // kullanıcı adı + IP biriktiriyordu.

  // Superuser'ın satıcı panelinde işi yok; `next` bir satıcı sayfasını
  // gösteriyor olsa bile yönetim paneline iner.
  if (profile.role === "superuser") {
    redirect("/yonetim");
  }

  redirect(safeNextPath(next));
}

/**
 * Girişin ikinci adımı: telefona giden kod.
 *
 * Buraya gelen istekte ne kullanıcı adı ne şifre var — yalnızca bilet numarası
 * ve kod. Şifre kontrolü `signIn`'de yapıldı; bileti açan da oydu, dolayısıyla
 * geçerli bir bilet "şifre doğrulandı" belgesi yerine geçiyor. Bilet beş dakika
 * yaşıyor, beş yanlış denemede yanıyor ve bir kez kullanılıyor.
 *
 * Oturum burada açılıyor: doğrulama geçince service role ile tek kullanımlık bir
 * giriş jetonu üretiliyor ve çerezler onunla kuruluyor. Şifre bu adımda bir daha
 * sorulmadığı için bekleyen bir oturumu saklamaya da gerek kalmıyor.
 */
export async function verifyLoginCode(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const challengeId = String(formData.get("challengeId") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");

  if (!challengeId) {
    return {
      error: "Doğrulama başlatılmadı. Baştan giriş yapın.",
      awaitingApproval: false,
      challengeId: null,
    };
  }

  if (!code) {
    return {
      error: "Doğrulama kodunu girin.",
      awaitingApproval: false,
      challengeId,
    };
  }

  const result = await verifyLoginChallenge(challengeId, code);

  if (!result.ok) {
    await recordSecurityEvent({
      kind: "two_factor_failed",
      severity: result.expired ? "warning" : "info",
      detail: { reason: result.expired ? "expired_or_exhausted" : "wrong_code" },
    });

    // Bilet yandıysa forma kod alanını göstermeye devam etmenin anlamı yok:
    // `challengeId` boş dönüyor ve form şifre adımına geri dönüyor.
    return {
      error: result.message,
      awaitingApproval: false,
      challengeId: result.expired ? null : challengeId,
    };
  }

  const opened = await openSessionFor(result.userId);

  if (!opened) {
    return {
      error: "Oturum açılamadı. Baştan giriş yapın.",
      awaitingApproval: false,
      challengeId: null,
    };
  }

  redirect("/yonetim");
}

/**
 * Şifresiz oturum açma — yalnızca kod doğrulandıktan sonra.
 *
 * Service role ile tek kullanımlık bir bağlantı jetonu üretiliyor ve hemen
 * tüketiliyor. Bağlantının kendisi hiçbir yere gitmiyor, e-posta gönderilmiyor;
 * `generateLink` yalnızca jetonu üretir. Jeton `verifyOtp`'ye verilince çerezler
 * kuruluyor ve oturum normal bir giriş gibi başlıyor.
 */
async function openSessionFor(userId: string): Promise<boolean> {
  const admin = createAdminClient();

  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;

  if (!email) {
    console.error("[2fa] doğrulanan kullanıcının e-postası bulunamadı");
    return false;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  const tokenHash = link?.properties?.hashed_token;

  if (linkError || !tokenHash) {
    console.error("[2fa] giriş jetonu üretilemedi:", linkError);
    return false;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (error) {
    console.error("[2fa] oturum açılamadı:", error);
    return false;
  }

  return true;
}

export async function signUp(
  _prevState: SignupState,
  formData: FormData
): Promise<SignupState> {
  const email = String(formData.get("email") ?? "").trim();
  const username = normalizeUsername(formData.get("username"));
  const password = String(formData.get("password") ?? "");

  if (!email || !username || !password) {
    return { error: "E-posta, kullanıcı adı ve şifre gereklidir.", notice: null, awaitingApproval: false };
  }

  if (!isValidUsername(username)) {
    return { error: `Kullanıcı adı geçersiz. ${USERNAME_RULE}`, notice: null, awaitingApproval: false };
  }

  // Formdaki canlı liste aynı kuralları kullanıyor (lib/password.ts), ama o
  // yalnızca tarayıcıda çalışıyor — elle atılan bir istek buraya takılır.
  const weak = passwordError(password);
  if (weak) {
    return { error: weak, notice: null, awaitingApproval: false };
  }

  // Biçim kontrollerinden sonra, veritabanına ve Supabase'e gitmeden önce:
  // buradan öteye geçen her istek bir hesap açıp formda yazılan adrese
  // doğrulama e-postası gönderiyor, ve o adres saldırganın seçtiği herhangi
  // biri olabilir (bkz. lib/security.ts).
  const limit = await checkSignupRateLimit();
  if (!limit.allowed) {
    return { error: limit.message, notice: null, awaitingApproval: false };
  }

  // Kullanıcı adı `profiles` üzerindeki unique kısıtla korunuyor; buradaki
  // kontrol sadece anlaşılır bir hata mesajı için. Yarış durumunda kısıt
  // devreye girer ve kayıt tümden geri alınır.
  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (taken) {
    return { error: "Bu kullanıcı adı kullanılıyor.", notice: null, awaitingApproval: false };
  }

  const supabase = await createClient();
  // `username` metadata'ya yazılır; `handle_new_user` trigger'ı onu aynı
  // işlemde `profiles` tablosuna taşır.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "Bu e-posta ile bir hesap zaten var.", notice: null, awaitingApproval: false };
    }
    // Trigger'daki unique ihlali Supabase'e "Database error saving new user"
    // olarak döner — bu noktada geriye tek olası çakışma kullanıcı adıdır.
    if (error.message.toLowerCase().includes("database error")) {
      return { error: "Bu kullanıcı adı kullanılıyor.", notice: null, awaitingApproval: false };
    }
    return {
      error: "Kayıt oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
      notice: null,
      awaitingApproval: false,
    };
  }

  // E-posta doğrulaması açıkken Supabase, kayıtlı bir adresi ele vermemek için
  // kimliksiz (identities: []) sahte bir kullanıcı döndürür.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Bu e-posta ile bir hesap zaten var.", notice: null, awaitingApproval: false };
  }

  // Kayıtlar onay beklediği için tek başına bir tehdit değil, ama arka arkaya
  // açılan onlarca hesap otomatik bir betiğin işareti — panelde görünsün.
  await recordSecurityEvent({
    kind: "signup",
    severity: "info",
    identifier: username,
  });

  // Kayıt `pending` doğuyor (bkz. profiles.status). Supabase e-posta doğrulaması
  // kapalıyken kayıtla birlikte oturum da açtığı için onu hemen kapatıyoruz:
  // onay gelmeden panele girilmesin. Yazma yolları RLS'te de kapalı, bu sadece
  // arayüzün doğru davranması için.
  if (data.session) {
    await supabase.auth.signOut();
  }

  return {
    error: null,
    notice:
      "Kaydınız alındı. Yönetici hesabınızı onayladıktan sonra kullanıcı adınız ve şifrenizle giriş yapabilirsiniz.",
    awaitingApproval: true,
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
