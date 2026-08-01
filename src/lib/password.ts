/**
 * Şifre kuralları — tek kaynak.
 *
 * Aynı liste hem kayıt formundaki canlı kontrol listesini besliyor hem de
 * sunucudaki doğrulamayı yapıyor. İkisi ayrı yerlerde tanımlanırsa er ya da geç
 * ayrışıyorlar ve kullanıcı, arayüzün kabul ettiği bir şifrenin sunucuda
 * reddedildiğini görüyor.
 *
 * Kurallar Supabase'in "Lowercase, uppercase letters, digits and symbols"
 * seçeneğiyle birebir aynı olmak zorunda (Authentication > Email). Buradaki
 * kontrol yalnızca anlaşılır bir hata için: asıl kapı Supabase'de, ama oradan
 * dönen hata hangi kuralın eksik olduğunu söylemiyor.
 */

export const MIN_PASSWORD_LENGTH = 10;

/**
 * Supabase'in sembol olarak saydığı karakterler. `[^a-zA-Z0-9]` demek cazip ama
 * yanlış olurdu: "şifreçğ" gibi bir metindeki Türkçe harfleri sembol sayardık,
 * Supabase saymaz ve kayıt sunucuda reddedilirdi.
 */
const SYMBOLS = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

export type PasswordRule = {
  id: string;
  label: string;
  ok: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `En az ${MIN_PASSWORD_LENGTH} karakter`,
    ok: (v) => v.length >= MIN_PASSWORD_LENGTH,
  },
  { id: "lower", label: "Bir küçük harf (a-z)", ok: (v) => /[a-z]/.test(v) },
  { id: "upper", label: "Bir büyük harf (A-Z)", ok: (v) => /[A-Z]/.test(v) },
  { id: "digit", label: "Bir rakam (0-9)", ok: (v) => /[0-9]/.test(v) },
  { id: "symbol", label: "Bir sembol (!?*.-_ gibi)", ok: (v) => SYMBOLS.test(v) },
];

/** Kaç kural sağlandı. Arayüzdeki güç göstergesi bunu kullanıyor. */
export function passwordScore(value: string): number {
  return PASSWORD_RULES.filter((rule) => rule.ok(value)).length;
}

/**
 * Sunucu tarafı doğrulama. Sağlanmayan ilk kuralı değil hepsini birden
 * söylüyor — kullanıcıyı tek tek deneme turuna sokmanın anlamı yok.
 */
export function passwordError(value: string): string | null {
  const missing = PASSWORD_RULES.filter((rule) => !rule.ok(value));
  if (missing.length === 0) return null;

  return `Şifre şu koşulları sağlamıyor: ${missing
    .map((rule) => rule.label.toLocaleLowerCase("tr"))
    .join(", ")}.`;
}
