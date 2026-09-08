/**
 * Karşılaştırma için harf sadeleştirme.
 *
 * Mesajda yazılan şey klavyeye ve aceleye bağlı: "Mayıs" da gelir "mayis" de,
 * "Nilüfer" de gelir "nilufer" de. Eşleştirme yaparken ikisi aynı olmalı;
 * kullanıcıya geri yazarken ise her zaman kanonik yazım kullanılıyor.
 *
 * Türkçe'ye özel iki incelik: `toLocaleLowerCase("tr-TR")` olmadan "I" harfi
 * "i" oluyor ("Isparta" → "isparta" yerine "ısparta" olmalı), ve aksan
 * temizliği küçültmeden *sonra* yapılmalı.
 */
export function sadelestir(metin: string): string {
  return metin
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a")
    .replaceAll("î", "i")
    .replaceAll("û", "u")
    .trim();
}
