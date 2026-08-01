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

// `awaitingApproval`, arayüzün "onay bekleniyor" penceresini açması için: aynı
// durum hem kayıttan hemen sonra hem de onaysız hesapla giriş denendiğinde
// doğuyor, ikisinde de aynı pencere çıkıyor (bkz. PendingApprovalDialog).
export type LoginState = { error: string | null; awaitingApproval: boolean };
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
    return { error: "Kullanıcı adı ve şifre gereklidir.", awaitingApproval: false };
  }

  // Şifre denenmeden önce: son 15 dakikadaki başarısız denemeler eşiği aştıysa
  // istek buradan geri döner. Eşik hem kullanıcı adına hem IP'ye bakıyor, ikisi
  // iki ayrı saldırıyı yakalıyor (bkz. lib/security.ts).
  const limit = await checkLoginRateLimit(identifier);
  if (!limit.allowed) {
    return { error: limit.message, awaitingApproval: false };
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
    return { error: "Kullanıcı adı veya şifre hatalı.", awaitingApproval: false };
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
    return { error: "Kullanıcı adı veya şifre hatalı.", awaitingApproval: false };
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
      };
    }

    return {
      error: "Hesabınız henüz onaylanmadı. Onaylandığında giriş yapabilirsiniz.",
      awaitingApproval: true,
    };
  }

  // Başarılı girişler de kaydediliyor: başarısız denemelerin arasında hangi
  // oturumların gerçekten açıldığını görmeden bir saldırının başarıya ulaşıp
  // ulaşmadığı anlaşılmaz.
  await recordSecurityEvent({
    kind: "login_ok",
    severity: "info",
    identifier,
    detail: { role: profile.role },
  });

  // Superuser'ın satıcı panelinde işi yok; `next` bir satıcı sayfasını
  // gösteriyor olsa bile yönetim paneline iner.
  if (profile.role === "superuser") {
    redirect("/yonetim");
  }

  redirect(safeNextPath(next));
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
