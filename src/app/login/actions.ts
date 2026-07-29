"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeNextPath } from "@/lib/redirects";
import { isValidUsername, normalizeUsername, USERNAME_RULE } from "@/lib/username";

export type LoginState = { error: string | null };
export type SignupState = { error: string | null; notice: string | null };

const MIN_PASSWORD_LENGTH = 6;

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
    return { error: "Kullanıcı adı ve şifre gereklidir." };
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
    return { error: "Kullanıcı adı veya şifre hatalı." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Kullanıcı adı veya şifre hatalı." };
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
    return {
      error:
        profile?.status === "rejected"
          ? "Başvurunuz onaylanmadı. Ayrıntı için yöneticiyle görüşün."
          : "Hesabınız henüz onaylanmadı. Onaylandığında giriş yapabilirsiniz.",
    };
  }

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
    return { error: "E-posta, kullanıcı adı ve şifre gereklidir.", notice: null };
  }

  if (!isValidUsername(username)) {
    return { error: `Kullanıcı adı geçersiz. ${USERNAME_RULE}`, notice: null };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`, notice: null };
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
    return { error: "Bu kullanıcı adı kullanılıyor.", notice: null };
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
      return { error: "Bu e-posta ile bir hesap zaten var.", notice: null };
    }
    // Trigger'daki unique ihlali Supabase'e "Database error saving new user"
    // olarak döner — bu noktada geriye tek olası çakışma kullanıcı adıdır.
    if (error.message.toLowerCase().includes("database error")) {
      return { error: "Bu kullanıcı adı kullanılıyor.", notice: null };
    }
    return {
      error: "Kayıt oluşturulamadı. Bilgileri kontrol edip tekrar deneyin.",
      notice: null,
    };
  }

  // E-posta doğrulaması açıkken Supabase, kayıtlı bir adresi ele vermemek için
  // kimliksiz (identities: []) sahte bir kullanıcı döndürür.
  if (data.user && data.user.identities?.length === 0) {
    return { error: "Bu e-posta ile bir hesap zaten var.", notice: null };
  }

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
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
