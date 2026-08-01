import "server-only";

/**
 * IP özetlerinde kullanılan tuz.
 *
 * Tuzsuz bir SHA-256 işe yaramaz: IP adresi uzayı küçük olduğu için özet kaba
 * kuvvetle geri çevrilebilir. O yüzden yalnızca sunucuda bulunan gizli bir
 * değer karıştırılıyor.
 *
 * Eskiden bu değer doğrudan service role anahtarıydı. Sorun şuydu: anahtar bir
 * gün sızıp değiştirilmek zorunda kalınsa — ki bu tam da acele edilen an —
 * daha önce yazılmış bütün özetler bir anda eşleşmez olurdu. Tarama
 * tekilleştirmesi (bkz. lib/scans.ts) aynı ziyaretçiyi yeniden sayardı, anlık
 * kullanıcı sayacı (bkz. lib/presence.ts) da öyle. Yani güvenlik gereği yapılan
 * bir işin görünür bedeli vardı ve bu, anahtarı değiştirmeyi caydırıyordu.
 *
 * Ayrı bir değişkene taşınınca ikisi birbirinden bağımsız oldu: anahtar
 * istenildiği an, hiçbir şey bozulmadan değiştirilebiliyor.
 *
 * `HASH_PEPPER` tanımlı değilse eski davranışa düşülüyor. Böylece bu sürüm
 * Vercel'e değişken eklenmeden yayına alınabilir; eklendiği an da özetler bir
 * kez tazelenip yoluna devam eder — kaybedilen tek şey o andaki iki dakikalık
 * sayaç penceresi.
 */
export function hashPepper(): string {
  return process.env.HASH_PEPPER ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}
