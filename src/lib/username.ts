/**
 * Kullanıcı adı kuralları — `profiles.username` üzerindeki check kısıtıyla
 * birebir aynı. Normalizasyon (kırpma + küçük harf) hem kayıtta hem girişte
 * çalışır, yoksa "Ahmet" ile kaydolan "ahmet" ile giriş yapamaz.
 */
export const USERNAME_RULE = "3-20 karakter; yalnızca küçük harf, rakam ve alt çizgi.";

export function normalizeUsername(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(username);
}
